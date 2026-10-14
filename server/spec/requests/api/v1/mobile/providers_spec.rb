require "rails_helper"

RSpec.describe "Mobile provider endpoints", type: :request do
  it "returns a short-lived Apple challenge without login" do
    post "/api/v1/mobile/challenges", as: :json
    expect(response).to have_http_status(:created)
    body = JSON.parse(response.body)
    challenge = MobileAuthChallenge.find(body["id"])
    expect(challenge.nonce_digest).to eq(Digest::SHA256.hexdigest(body["nonce"]))
    expect(challenge).to be_available
  end

  it "rejects a missing provider proof with a readable 401" do
    post "/api/v1/mobile/provider_sessions", params: { provider: "apple" }, as: :json
    expect(response).to have_http_status(:unauthorized)
    expect(JSON.parse(response.body)["error"]).to include("token required")
  end

  it "rejects invalid bearer linking even when a browser cookie is valid" do
    user = create(:user)
    post "/api/v1/sessions", params: { email: user.email, password: "password123" }, as: :json
    post "/api/v1/mobile/provider_sessions", params: { provider: "google", identity_token: "proof" }, headers: { Authorization: "Bearer invalid" }, as: :json
    expect(response).to have_http_status(:unauthorized)
    expect(AuthIdentity.count).to eq(0)
  end

  it "returns a bearer session after verified provider authentication" do
    claims = { "sub" => "google-sub", "email" => "provider@gmail.com", "email_verified" => true }
    verifier = instance_double(Mobile::ProviderVerificationService, verify_identity: Mobile::ProviderVerificationService::Result.new(claims))
    allow(Mobile::ProviderVerificationService).to receive(:new).and_return(verifier)
    post "/api/v1/mobile/provider_sessions", params: { provider: "google", identity_token: "verified-proof" }, as: :json
    expect(response).to have_http_status(:created)
    token = JSON.parse(response.body)["token"]
    get "/api/v1/account", headers: { Authorization: "Bearer #{token}" }
    expect(response).to have_http_status(:ok)
    expect(JSON.parse(response.body)["email"]).to eq("provider@gmail.com")
  end

  context "linking and account deletion" do
    let(:user) { create(:user) }
    let(:claims) { { "sub" => "new-google-subject", "email" => "another@gmail.com", "email_verified" => true } }
    let(:source) { Mobile::CreateSessionService.new(user).create_session }

    before do
      verifier = instance_double(Mobile::ProviderVerificationService, verify_identity: Mobile::ProviderVerificationService::Result.new(claims))
      allow(Mobile::ProviderVerificationService).to receive(:new).and_return(verifier)
    end

    def provider_sign_in(token, proof = "new-provider-proof")
      post "/api/v1/mobile/provider_sessions", params: { provider: "google", identity_token: proof },
        headers: { Authorization: "Bearer #{token}" }, as: :json
    end

    def delete_account(token)
      delete "/api/v1/mobile/account", params: { confirmation: "DELETE" },
        headers: { Authorization: "Bearer #{token}" }, as: :json
    end

    it "rejects linking another identity through an old bearer without renewing deletion eligibility" do
      source.session.update!(created_at: 10.minutes.ago)
      expect { provider_sign_in(source.token) }.not_to change(MobileSession, :count)
      expect(response).to have_http_status(:unauthorized)
      expect(user.auth_identities).to be_empty
      delete_account(source.token)
      expect(response).to have_http_status(:unauthorized)
      expect(User.exists?(user.id)).to be(true)
    end

    it "allows recent linking but requires proof of the linked identity before deletion" do
      provider_sign_in(source.token)
      expect(response).to have_http_status(:created)
      linked = JSON.parse(response.body)
      expect(linked["authentication_method"]).to eq("google")
      expect(user.auth_identities.find_by(subject: claims["sub"])).to be_present

      delete_account(linked["token"])
      expect(response).to have_http_status(:unauthorized)
      expect(User.exists?(user.id)).to be(true)

      provider_sign_in(linked["token"], "fresh-existing-identity-proof")
      expect(response).to have_http_status(:created)
      authenticated = JSON.parse(response.body)
      delete_account(authenticated["token"])
      expect(response).to have_http_status(:no_content)
      expect(User.exists?(user.id)).to be(false)
    end

    it "reauthenticates an already-linked subject through an old bearer" do
      user.auth_identities.create!(provider: "google", subject: claims["sub"], ownership_verified_at: Time.current)
      source.session.update!(created_at: 10.minutes.ago)
      provider_sign_in(source.token)
      expect(response).to have_http_status(:created)
      delete_account(JSON.parse(response.body)["token"])
      expect(response).to have_http_status(:no_content)
      expect(User.exists?(user.id)).to be(false)
    end
  end
end
