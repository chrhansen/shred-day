require "rails_helper"

RSpec.describe "Mobile HTTP caching", type: :request do
  let(:user) { create(:user) }
  let(:token) { Mobile::CreateSessionService.new(user).create_session.token }
  let(:headers) { { Authorization: "Bearer #{token}" } }

  it "returns complete statistics even when the device sends a previous ETag" do
    post api_v1_sessions_path, params: { email: user.email, password: user.password }
    get api_v1_stats_path, params: { season: -1 }
    etag = response.headers["ETag"]
    expect(etag).to be_present

    get api_v1_stats_path, params: { season: -1 }, headers: headers.merge("If-None-Match" => etag)
    expect(response).to have_http_status(:ok)
    expect(response.parsed_body.dig("summary", "totalDays")).to eq(0)
    expect(response.headers["Cache-Control"]).to include("no-store")
  end

  it "does not store authenticated mobile account responses" do
    get api_v1_account_path, headers: headers
    expect(response).to have_http_status(:ok)
    expect(response.headers["Cache-Control"]).to include("no-store")
  end

  it "still rejects an invalid bearer token" do
    get api_v1_stats_path, headers: { Authorization: "Bearer invalid" }
    expect(response).to have_http_status(:unauthorized)
  end

  it "preserves conditional requests for the cookie-authenticated website" do
    post api_v1_sessions_path, params: { email: user.email, password: user.password }
    get api_v1_stats_path, params: { season: -1 }
    get api_v1_stats_path, params: { season: -1 }, headers: { "If-None-Match" => response.headers["ETag"] }
    expect(response).to have_http_status(:not_modified)
  end
end
