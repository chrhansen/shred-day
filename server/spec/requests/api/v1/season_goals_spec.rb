# spec/requests/api/v1/season_goals_spec.rb
require "rails_helper"

RSpec.describe "Api::V1::SeasonGoals", type: :request do
  let!(:user) { create(:user) }

  describe "PATCH /api/v1/season_goals/:id" do
    context "when not authenticated" do
      it "returns unauthorized" do
        patch "/api/v1/season_goals/2025", params: { season_goal: { goal_days: 60 } }
        expect(response).to have_http_status(:unauthorized)
      end
    end

    context "when authenticated" do
      before do
        post api_v1_sessions_path, params: { email: user.email, password: user.password }
        expect(response).to have_http_status(:ok)
      end

      it "upserts the goal" do
        patch "/api/v1/season_goals/2025", params: { season_goal: { goal_days: 60 } }
        expect(response).to have_http_status(:ok)

        json = JSON.parse(response.body)
        expect(json).to include("seasonStartYear" => 2025, "goalDays" => 60)
        expect(user.season_goals.find_by(season_start_year: 2025)&.goal_days).to eq(60)

        patch "/api/v1/season_goals/2025", params: { season_goal: { goal_days: 75 } }
        expect(response).to have_http_status(:ok)
        expect(user.season_goals.find_by(season_start_year: 2025)&.goal_days).to eq(75)
      end
    end
  end
end

