require "rails_helper"

RSpec.describe "Password recovery", type: :request do
  include ActiveSupport::Testing::TimeHelpers

  let(:email) { "recovery@example.com" }
  let(:password) { "replacement-password-123" }
  let!(:user) { create(:user, email: email) }

  before { ActionMailer::Base.deliveries.clear }

  def request_link(address = email)
    post "/api/v1/password_reset_requests", params: { email: address }, as: :json
    expect(response).to have_http_status(:accepted)
    mail = ActionMailer::Base.deliveries.reverse.find { |delivery| delivery.to == [ email ] }
    mail&.text_part&.body&.decoded&.[](/#token=([A-Za-z0-9_-]+)/, 1)
  end

  def reset_password(token, overrides = {})
    post "/api/v1/password_resets", params: {
      token: token, password: password, password_confirmation: password
    }.merge(overrides), as: :json
  end

  it "allows logged-out recovery without changing the password or creating a session on request" do
    get "/api/v1/account"
    expect(response).to have_http_status(:unauthorized)
    digest = user.password_digest
    token = request_link("  RECOVERY@EXAMPLE.COM  ")
    expect(token).to match(/\A[A-Za-z0-9_-]{43}\z/)
    expect(response.headers["Cache-Control"]).to eq("no-store")
    expect(user.reload.password_digest).to eq(digest)
    expect(session[:user_id]).to be_nil
    expect(MobileSession.count).to eq(0)
    expect(user.password_reset_token_digest).to eq(Digest::SHA256.hexdigest(token))
    expect(user.password_reset_expires_at).to be_within(2.seconds).of(1.hour.from_now)
  end

  it "returns the same public response for existing, unknown, and malformed addresses" do
    request_link
    expected = response.parsed_body
    [ "missing@example.com", "", nil, [ email ], { address: email } ].each do |address|
      expect { request_link(address) }.not_to change(ActionMailer::Base.deliveries, :count)
      expect(response.parsed_body).to eq(expected)
    end
    expect(expected).not_to have_key("token")
    expect(expected).not_to have_key("user")
  end

  it "resets the password, consumes the link and requires a new browser or mobile login" do
    token = request_link
    reset_password(token)
    expect(response).to have_http_status(:ok)
    expect(response.headers["Cache-Control"]).to eq("no-store")
    expect(session[:user_id]).to be_nil
    expect(MobileSession.count).to eq(0)
    expect(user.reload.authenticate("password123")).to be(false)
    expect(user.authenticate(password)).to eq(user)
    expect(user).to be_password_confirmed
    expect(user.password_reset_token_digest).to be_nil
    expect(user.password_reset_expires_at).to be_nil
    expect(user.password_reset_session_version).to be_nil

    get "/api/v1/account"
    expect(response).to have_http_status(:unauthorized)
    [ "/api/v1/sessions", "/api/v1/mobile/sessions" ].each do |path|
      post path, params: { email: email, password: "password123" }, as: :json
      expect(response).to have_http_status(:unauthorized)
      post path, params: { email: email, password: password }, as: :json
      expect(response).to have_http_status(path.include?("mobile") ? :created : :ok)
      expect(response.parsed_body.to_s).not_to include("password_reset")
    end
    get "/api/v1/account"
    expect(response.parsed_body.keys.grep(/password_reset|digest|session_version/)).to be_empty
  end

  it "rejects reused, expired, missing, malformed and unknown tokens" do
    token = request_link
    reset_password(token)
    expect(response).to have_http_status(:ok)
    [ token, nil, "", "invalid", "z" * 43, [ token ], { token: token } ].each do |invalid|
      reset_password(invalid)
      expect(response).to have_http_status(:unprocessable_content)
      expect(response.parsed_body["error"]).to eq(Users::PasswordResetService::INVALID_LINK)
    end
    travel 61.seconds
    token = request_link
    travel 1.hour
    reset_password(token)
    expect(response).to have_http_status(:unprocessable_content)
  end

  it "keeps the token usable when passwords are missing, mismatched, too short or too long" do
    token = request_link
    [
      { password: nil }, { password_confirmation: nil }, { password: "" },
      { password: "short", password_confirmation: "short" }, { password_confirmation: "different" },
      { password: "x" * 73, password_confirmation: "x" * 73 }, { password: [ password ] },
      { password: { value: password } }
    ].each do |overrides|
      reset_password(token, overrides)
      expect(response).to have_http_status(:unprocessable_content)
      expect(response.parsed_body["errors"]).to be_present
      expect(user.reload.authenticate("password123")).to eq(user)
      expect(user.password_session_version).to eq(0)
    end
    reset_password(token)
    expect(response).to have_http_status(:ok)
  end

  it "enforces the account cooldown and replaces the old link on resend" do
    first = request_link
    expect { request_link }.not_to change(ActionMailer::Base.deliveries, :count)
    travel 61.seconds
    second = request_link
    expect(second).not_to eq(first)
    reset_password(first)
    expect(response).to have_http_status(:unprocessable_content)
    reset_password(second)
    expect(response).to have_http_status(:ok)
  end

  it "revokes existing browser and mobile password sessions while preserving verified provider access" do
    post "/api/v1/sessions", params: { email: email, password: "password123" }, as: :json
    expect(response).to have_http_status(:ok)
    old_cookie = cookies["_shred_day_session"]
    mobile = Mobile::CreateSessionService.new(user).create_session
    identity = user.auth_identities.create!(provider: "google", subject: "verified-owner", ownership_verified_at: Time.current)
    provider = Mobile::CreateSessionService.new(user, authentication_method: "google", auth_identity: identity).create_session
    reset_password(request_link)
    expect(response).to have_http_status(:ok)
    expect(user.reload.password_session_version).to eq(1)
    expect(mobile.session.reload.revoked_at).to be_present
    expect(provider.session.reload.revoked_at).to be_nil

    cookies["_shred_day_session"] = old_cookie
    get "/api/v1/account"
    expect(response).to have_http_status(:unauthorized)
    get "/api/v1/account", headers: { Authorization: "Bearer #{mobile.token}" }
    expect(response).to have_http_status(:unauthorized)
    get "/api/v1/account", headers: { Authorization: "Bearer #{provider.token}" }
    expect(response).to have_http_status(:ok)
  end

  it "recovers unconfirmed legacy accounts and invalidates their outstanding confirmation links" do
    user.update!(email_confirmed_at: nil, password_confirmed_at: nil)
    Users::EmailConfirmationService.new.send_confirmation(user)
    confirmation_token = ActionMailer::Base.deliveries.last.text_part.body.decoded[/#token=([A-Za-z0-9_-]+)/, 1]
    reset_password(request_link)
    expect(response).to have_http_status(:ok)
    expect(user.reload).to be_password_confirmed
    expect(user.email_confirmation_token_digest).to be_nil
    post "/api/v1/email_confirmations", params: { token: confirmation_token,
      password: "another-password", password_confirmation: "another-password" }, as: :json
    expect(response).to have_http_status(:unprocessable_content)
    expect(user.reload.authenticate(password)).to eq(user)
  end

  it "invalidates outstanding reset links after another password change or email confirmation" do
    token = request_link
    AccountUpdateService.new(user, password: "changed-elsewhere").update
    reset_password(token)
    expect(response).to have_http_status(:unprocessable_content)
    travel 61.seconds
    token = request_link
    confirmation_token = ActionMailer::Base.deliveries.reverse.find { |mail| mail.subject.include?("Confirm") }
      .text_part.body.decoded[/#token=([A-Za-z0-9_-]+)/, 1]
    post "/api/v1/email_confirmations", params: { token: confirmation_token,
      password: password, password_confirmation: password }, as: :json
    expect(response).to have_http_status(:ok)
    reset_password(token)
    expect(response).to have_http_status(:unprocessable_content)
  end

  it "does not change the password when a scanner follows a GET link" do
    token = request_link
    get "/api/v1/password_resets", params: { token: token }, as: :json
    expect(response).not_to have_http_status(:ok)
    expect(user.reload.authenticate("password123")).to eq(user)
    reset_password(token)
    expect(response).to have_http_status(:ok)
  end

  it "does not send a recovery link for ambiguous case-insensitive addresses" do
    duplicate = create(:user, email: "duplicate@example.com")
    duplicate.update_columns(email: email.upcase)
    expect { request_link }.not_to change(ActionMailer::Base.deliveries, :count)
    expect(response.parsed_body["message"]).to eq(Users::PasswordResetService::REQUEST_MESSAGE)
    expect(user.reload.password_reset_token_digest).to be_nil
  end

  it "invalidates a reset link when provider ownership recovers an unconfirmed account" do
    user.update!(email_confirmed_at: nil, password_confirmed_at: nil)
    token = request_link
    Users::ConfirmProviderEmailService.new(user, { "email" => email, "email_verified" => true }).confirm_email
    reset_password(token)
    expect(response).to have_http_status(:unprocessable_content)
    expect(user.reload.password_confirmed_at).to be_nil
  end

  it "clears a revoked browser session after resetting while already signed in" do
    post "/api/v1/sessions", params: { email: email, password: "password123" }, as: :json
    reset_password(request_link)
    expect(response).to have_http_status(:ok)
    delete "/api/v1/sessions"
    expect(response).to have_http_status(:ok)
    expect(session[:user_id]).to be_nil
  end

  it "applies IP limits to reset requests and reset attempts" do
    [ Api::V1::PasswordResetRequestsController, Api::V1::PasswordResetsController ].each do |controller|
      allow(controller.cache_store).to receive(:increment).and_return(100)
    end
    expect { post "/api/v1/password_reset_requests", params: { email: email }, as: :json }
      .not_to change(ActionMailer::Base.deliveries, :count)
    expect(response).to have_http_status(:too_many_requests)
    reset_password("a" * 43)
    expect(response).to have_http_status(:too_many_requests)
  end
end
