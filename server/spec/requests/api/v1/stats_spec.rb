# spec/requests/api/v1/stats_spec.rb
require 'rails_helper'

RSpec.describe "Api::V1::Stats", type: :request do
  # Use let! to ensure user and related data are created before tests
  let!(:user) { create(:user) }
  let!(:resort1) { create(:resort) }
  let!(:resort2) { create(:resort) } # Another distinct resort
  let!(:ski1) { create(:ski, user: user) }
  let!(:ski2) { create(:ski, user: user) }
  let!(:day1) { create(:day, user: user, resort: resort1, skis: [ski1], date: Date.today - 2) }
  let!(:day2) { create(:day, user: user, resort: resort1, skis: [ski1], date: Date.today - 1) } # Same resort, same ski
  let!(:day3) { create(:day, user: user, resort: resort2, skis: [ski2], date: Date.today) }     # Different resort, different ski

  describe "GET /api/v1/stats" do
    context "when not authenticated" do
      it "returns unauthorized status" do
        get api_v1_stats_path # Use path helper
        expect(response).to have_http_status(:unauthorized)
      end
    end

    context "when authenticated" do
      before do
        # Simulate login before the request (adjust if your auth method differs)
        # This assumes session-based auth; adapt for tokens if needed.
        post api_v1_sessions_path, params: { email: user.email, password: user.password } # Log in the user
        expect(response).to have_http_status(:ok) # Ensure login was successful
      end

      it "returns ok status" do
        get api_v1_stats_path
        expect(response).to have_http_status(:ok)
      end

      it "returns the correct stats structure and values" do
        get api_v1_stats_path
        json_response = JSON.parse(response.body)

        expect(json_response).to have_key("totalDays")
        expect(json_response["totalDays"]).to eq(3)

        expect(json_response).to have_key("uniqueResorts")
        expect(json_response["uniqueResorts"]).to eq(2)

        expect(json_response).to have_key("mostUsedSki")

        expect(json_response["mostUsedSki"]).to eq(ski1.name) # ski1 was used twice
      end
    end
  end
end
