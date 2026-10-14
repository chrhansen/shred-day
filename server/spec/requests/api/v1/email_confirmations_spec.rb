require "rails_helper"

RSpec.describe "Password email confirmation", type: :request do
  include ActiveSupport::Testing::TimeHelpers

  let(:email) { "confirmation@example.com" }
  let(:password) { "confirmed-password-123" }

  def pending_user
    User.create!(email: email, password: "provisional-password")
  end

  def request_link
    post "/api/v1/email_confirmation_requests", params: { email: email }, as: :json
    expect(response).to have_http_status(:accepted)
    mail = ActionMailer::Base.deliveries.reverse.find { |delivery| delivery.to == [email] }
    mail.text_part.body.decoded[/#token=([A-Za-z0-9_-]+)/, 1]
  end

  def confirm(token, overrides = {})
    post "/api/v1/email_confirmations", params: {
      token: token, password: password, password_confirmation: password
    }.merge(overrides), as: :json
  end

  around do |example|
    previous_adapter = ActiveJob::Base.queue_adapter
    ActiveJob::Base.queue_adapter = :inline
    ActionMailer::Base.deliveries.clear
    example.run
  ensure
    ActiveJob::Base.queue_adapter = previous_adapter
  end

  it "requires confirmation after browser signup without granting a cookie session" do
    post "/api/v1/users", params: { user: { email: email } }, as: :json
    expect(response).to have_http_status(:created)
    expect(response.parsed_body).to include("confirmation_required" => true)
    expect(response.parsed_body).not_to have_key("user")
    expect(session[:user_id]).to be_nil
    expect(User.find_by!(email: email).password_confirmed_at).to be_nil
    get "/api/v1/account"
    expect(response).to have_http_status(:unauthorized)
  end

  it "accepts legacy mobile signup passwords provisionally without a bearer or cookie" do
    post "/api/v1/mobile/users", params: { user: { email: email, password: "provisional-password" } }, as: :json
    expect(response).to have_http_status(:created)
    expect(response.parsed_body).to include("confirmation_required" => true)
    expect(response.parsed_body).not_to have_key("token")
    expect(MobileSession.count).to eq(0)
    expect(session[:user_id]).to be_nil
  end

  it "blocks unconfirmed browser and mobile password logins even with a correct password" do
    pending_user
    ["/api/v1/sessions", "/api/v1/mobile/sessions"].each do |path|
      post path, params: { email: email, password: "provisional-password" }, as: :json
      expect(response).to have_http_status(:forbidden)
      expect(response.parsed_body).to include("code" => "email_confirmation_required")
      expect(response.parsed_body).not_to have_key("token")
    end
    expect(MobileSession.count).to eq(0)
    expect(session[:user_id]).to be_nil
  end

  it "confirms mailbox ownership, replaces the provisional password and requires a subsequent login" do
    user = pending_user
    token = request_link
    confirm(token)
    expect(response).to have_http_status(:ok)
    expect(session[:user_id]).to be_nil
    expect(MobileSession.count).to eq(0)
    expect(user.reload.email_confirmed_at).to be_present
    expect(user.password_confirmed_at).to be_present
    expect(user.authenticate("provisional-password")).to be(false)
    expect(user.authenticate(password)).to eq(user)
    expect(user.email_confirmation_token_digest).to be_nil

    post "/api/v1/sessions", params: { email: email, password: password }, as: :json
    expect(response).to have_http_status(:ok)
    get "/api/v1/account"
    expect(response).to have_http_status(:ok)
    expect(response.parsed_body.keys.grep(/digest|confirmation_token|session_version/)).to be_empty
  end

  it "rejects a reused token and an expired token" do
    pending_user
    token = request_link
    confirm(token)
    expect(response).to have_http_status(:ok)
    confirm(token)
    expect(response).to have_http_status(:unprocessable_content)
    expect(response.parsed_body["error"]).to include("invalid or has expired")

    User.find_by!(email: email).update_columns(password_confirmed_at: nil)
    travel 61.seconds
    token = request_link
    travel 25.hours
    confirm(token)
    expect(response).to have_http_status(:unprocessable_content)
  end

  it "does not consume the link when the new password or confirmation is invalid" do
    pending_user
    token = request_link
    confirm(token, password: "short", password_confirmation: "different")
    expect(response).to have_http_status(:unprocessable_content)
    expect(response.parsed_body["errors"]).to be_present
    confirm(token)
    expect(response).to have_http_status(:ok)
  end

  it "rotates the token on resend and enforces a per-account cooldown" do
    pending_user
    first = request_link
    expect { request_link }.not_to change(ActionMailer::Base.deliveries, :count)
    travel 61.seconds do
      second = request_link
      confirm(first)
      expect(response).to have_http_status(:unprocessable_content)
      confirm(second)
      expect(response).to have_http_status(:ok)
    end
  end

  it "does not reveal missing or already confirmed accounts in resend responses" do
    post "/api/v1/email_confirmation_requests", params: { email: email }, as: :json
    missing = response.parsed_body
    expect(response).to have_http_status(:accepted)
    create(:user, email: email)
    expect { post "/api/v1/email_confirmation_requests", params: { email: email }, as: :json }
      .not_to change(ActionMailer::Base.deliveries, :count)
    expect(response).to have_http_status(:accepted)
    expect(response.parsed_body).to eq(missing)
  end

  it "blocks existing password bearers until confirmation and revokes them when a password is confirmed" do
    user = pending_user
    old = Mobile::CreateSessionService.new(user).create_session
    identity = user.auth_identities.create!(provider: "google", subject: "trusted-google", ownership_verified_at: Time.current)
    provider = Mobile::CreateSessionService.new(user, authentication_method: "google", auth_identity: identity).create_session
    get "/api/v1/account", headers: { Authorization: "Bearer #{old.token}" }
    expect(response).to have_http_status(:unauthorized)
    expect(response.parsed_body["code"]).to eq("email_confirmation_required")
    get "/api/v1/account", headers: { Authorization: "Bearer #{provider.token}" }
    expect(response).to have_http_status(:ok)

    confirm(request_link)
    expect(response).to have_http_status(:ok)
    expect(old.session.reload.revoked_at).to be_present
    expect(provider.session.reload.revoked_at).to be_nil
    get "/api/v1/account", headers: { Authorization: "Bearer #{old.token}" }
    expect(response).to have_http_status(:unauthorized)
  end

  it "blocks a previously issued password browser cookie after the account loses confirmation" do
    user = create(:user, email: email)
    post "/api/v1/sessions", params: { email: email, password: user.password }, as: :json
    expect(response).to have_http_status(:ok)
    user.update_columns(password_confirmed_at: nil)
    get "/api/v1/account"
    expect(response).to have_http_status(:unauthorized)
    expect(response.parsed_body["code"]).to eq("email_confirmation_required")
  end

  it "rejects password browser cookies whose credential version was revoked" do
    user = create(:user, email: email)
    post "/api/v1/sessions", params: { email: email, password: user.password }, as: :json
    expect(response).to have_http_status(:ok)
    user.increment!(:password_session_version)
    get "/api/v1/account"
    expect(response).to have_http_status(:unauthorized)
  end

  it "reloads password credentials under the account lock before issuing a browser or mobile session" do
    user = create(:user, email: email)
    stale = User.find(user.id)
    AccountUpdateService.new(user, password: "replacement-password").update
    allow(User).to receive(:find_by).and_call_original
    allow(User).to receive(:find_by).with(email: email).and_return(stale)
    ["/api/v1/sessions", "/api/v1/mobile/sessions"].each do |path|
      post path, params: { email: email, password: "password123" }, as: :json
      expect(response).to have_http_status(:unauthorized)
      expect(response.parsed_body).not_to have_key("token")
      expect(session[:user_id]).to be_nil
    end
    expect(MobileSession.count).to eq(0)
  end

  it "does not send mail or return confirmation details for a wrong password" do
    pending_user
    expect { post "/api/v1/mobile/sessions", params: { email: email, password: "wrong-password" }, as: :json }
      .not_to change(ActionMailer::Base.deliveries, :count)
    expect(response).to have_http_status(:unauthorized)
    expect(response.parsed_body).not_to have_key("confirmation_required")
  end

  it "prevents a provider account from claiming another email through an unverified profile update" do
    owner = create(:user, email: "original-owner@example.com")
    owner.auth_identities.create!(provider: "google", subject: "original-owner-subject")
    identity = owner.auth_identities.first
    identity.update!(ownership_verified_at: Time.current)
    access = Mobile::CreateSessionService.new(owner, authentication_method: "google", auth_identity: identity).create_session
    patch "/api/v1/account", params: { user: { email: email } },
      headers: { Authorization: "Bearer #{access.token}" }, as: :json
    expect(response).to have_http_status(:unprocessable_content)
    expect(owner.reload.email).to eq("original-owner@example.com")

    claims = { "sub" => "genuine-owner-subject", "email" => email, "email_verified" => true }
    verifier = instance_double(Mobile::ProviderVerificationService,
      verify_identity: Mobile::ProviderVerificationService::Result.new(claims))
    allow(Mobile::ProviderVerificationService).to receive(:new).and_return(verifier)
    result = Mobile::ProviderSignInService.new(provider: "google", identity_token: "genuine-owner-proof").sign_in
    expect(result).to be_signed_in
    expect(result.session_result.session.user).not_to eq(owner)
    expect(result.session_result.session.user.email).to eq(email)
    expect(owner.auth_identities.count).to eq(1)
  end

  it "can confirm and subsequently sign in on mobile without ever creating a browser session" do
    pending_user
    confirm(request_link)
    expect(response).to have_http_status(:ok)
    post "/api/v1/mobile/sessions", params: { email: email, password: password }, as: :json
    expect(response).to have_http_status(:created)
    token = response.parsed_body.fetch("token")
    expect(session[:user_id]).to be_nil
    get "/api/v1/account", headers: { Authorization: "Bearer #{token}" }
    expect(response).to have_http_status(:ok)
  end

  it "never consumes a confirmation through a GET request" do
    user = pending_user
    token = request_link
    get "/api/v1/email_confirmations", params: { token: token }, as: :json
    expect(response).not_to have_http_status(:ok)
    expect(user.reload.password_confirmed_at).to be_nil
    confirm(token)
    expect(response).to have_http_status(:ok)
  end

  it "applies hourly IP signup limits to browser and mobile email delivery" do
    [Api::V1::UsersController, Api::V1::Mobile::UsersController].each do |controller|
      allow(controller.cache_store).to receive(:increment).and_wrap_original do |original, *args, **options|
        options[:expires_in] == 1.hour ? 11 : original.call(*args, **options)
      end
    end
    ["/api/v1/users", "/api/v1/mobile/users"].each do |path|
      expect { post path, params: { user: { email: email } }, as: :json }.not_to change(User, :count)
      expect(response).to have_http_status(:too_many_requests)
    end
    expect(ActionMailer::Base.deliveries).to be_empty
  end

  it "does not revive an attacker's legacy provider access when the true mailbox owner confirms" do
    user = pending_user
    identity = user.auth_identities.create!(provider: "apple", subject: "legacy-subject", refresh_token: "preserved-refresh-token")
    encrypted = identity.encrypted_refresh_token
    legacy = Mobile::CreateSessionService.new(user, authentication_method: "apple").create_session
    get "/api/v1/account", headers: { Authorization: "Bearer #{legacy.token}" }
    expect(response).to have_http_status(:unauthorized)

    confirm(request_link)
    expect(response).to have_http_status(:ok)
    get "/api/v1/account", headers: { Authorization: "Bearer #{legacy.token}" }
    expect(response).to have_http_status(:unauthorized)
    expect(identity.reload.ownership_verified_at).to be_nil
    expect(identity.encrypted_refresh_token).to eq(encrypted)
    expect(identity.refresh_token).to eq("preserved-refresh-token")
  end

  it "requires provider sessions to bind a trusted identity belonging to the same account" do
    user = create(:user)
    other = create(:user)
    identity = other.auth_identities.create!(provider: "google", subject: "another-owner", ownership_verified_at: Time.current)
    foreign = Mobile::CreateSessionService.new(user, authentication_method: "google", auth_identity: identity).create_session
    get "/api/v1/account", headers: { Authorization: "Bearer #{foreign.token}" }
    expect(response).to have_http_status(:unauthorized)
  end

  it "keeps old unbound sessions invalid after a fresh verified provider proof trusts the same legacy identity" do
    user = pending_user
    identity = user.auth_identities.create!(provider: "google", subject: "genuine-subject")
    old = Mobile::CreateSessionService.new(user, authentication_method: "google").create_session
    claims = { "sub" => identity.subject, "email" => email, "email_verified" => true }
    verifier = instance_double(Mobile::ProviderVerificationService,
      verify_identity: Mobile::ProviderVerificationService::Result.new(claims))
    allow(Mobile::ProviderVerificationService).to receive(:new).and_return(verifier)
    post "/api/v1/mobile/provider_sessions", params: { provider: "google", identity_token: "fresh-provider-proof" }, as: :json
    expect(response).to have_http_status(:created)
    fresh = response.parsed_body.fetch("token")
    expect(identity.reload).to be_ownership_verified
    expect(response.parsed_body.keys.grep(/identity_id|ownership_verified/)).to be_empty
    get "/api/v1/account", headers: { Authorization: "Bearer #{fresh}" }
    expect(response).to have_http_status(:ok)
    get "/api/v1/account", headers: { Authorization: "Bearer #{old.token}" }
    expect(response).to have_http_status(:unauthorized)
    expect(ActionMailer::Base.deliveries.none? { |mail| mail.to == [email] }).to be(true)
  end

  it "rejects a password session read before its credential version was revoked" do
    user = create(:user)
    issued = Mobile::CreateSessionService.new(user).create_session
    stale = MobileSession.find(issued.session.id)
    user.increment!(:password_session_version)
    issued.session.update!(revoked_at: Time.current)
    allow(MobileSession).to receive(:find_by_token).and_call_original
    allow(MobileSession).to receive(:find_by_token).with(issued.token).and_return(stale)
    get "/api/v1/account", headers: { Authorization: "Bearer #{issued.token}" }
    expect(response).to have_http_status(:unauthorized)
  end

  it "does not authorize an old password bearer with no credential-version binding" do
    user = create(:user)
    old = Mobile::CreateSessionService.new(user).create_session
    old.session.update_columns(password_session_version: nil)
    get "/api/v1/account", headers: { Authorization: "Bearer #{old.token}" }
    expect(response).to have_http_status(:unauthorized)
  end
end
