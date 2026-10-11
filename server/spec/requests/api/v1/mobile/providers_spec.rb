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
end
