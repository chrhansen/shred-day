# spec/requests/api/v1/stats_spec.rb
require "rails_helper"

RSpec.describe "Api::V1::Stats", type: :request do
  include ActiveSupport::Testing::TimeHelpers

  let!(:user) { create(:user, season_start_day: "09-01") }
  let(:converter) { OffsetDateRangeConverterService.new(user.season_start_day) }

  describe "GET /api/v1/stats" do
    context "when not authenticated" do
      it "returns unauthorized" do
        get api_v1_stats_path
        expect(response).to have_http_status(:unauthorized)
        expect(JSON.parse(response.body)).to include(
          "error" => "You must be logged in to access this section"
        )
      end
    end

    context "when authenticated" do
      around do |example|
        travel_to(Time.zone.parse("2026-02-07 12:00:00 UTC")) { example.run }
      end

      before do
        post api_v1_sessions_path, params: { email: user.email, password: user.password }
        expect(response).to have_http_status(:ok)
      end

      it "returns season-scoped stats payload" do
        start0, end0 = converter.date_range(0)
        start1, end1 = converter.date_range(-1)

        resort1 = create(:resort, name: "Zermatt", country: "Switzerland", latitude: 46.0207, longitude: 7.7491)
        resort2 = create(:resort, name: "Chamonix", country: "France", latitude: 45.9237, longitude: 6.8694)

        ski1 = create(:ski, user: user, name: "Atomic Redster G9, 181")
        ski2 = create(:ski, user: user, name: "Fischer Ranger 102")

        create(:day, :with_tags, user: user, resort: resort1, skis: [ski1], date: Date.current - 2, tag_names: ["Powder"])
        create(:day, :with_tags, user: user, resort: resort1, skis: [ski1], date: Date.current - 1, tag_names: ["Powder", "Groomed"])
        create(:day, :with_tags, user: user, resort: resort2, skis: [ski2], date: Date.current, tag_names: ["Groomed"])
        # Duplicate same calendar date should not increase streak.
        create(:day, :with_tags, user: user, resort: resort1, skis: [ski1], date: Date.current, tag_names: ["Groomed"])

        # Outside season 0, but inside season -1 (sanity check filtering)
        create(:day, user: user, resort: resort2, skis: [ski2], date: start1 + 1.day)
        create(:day, user: user, resort: resort2, skis: [ski2], date: start0 - 1.day)

        get api_v1_stats_path, params: { season: 0 }
        expect(response).to have_http_status(:ok)
        json = JSON.parse(response.body)

        expect(json["season"]).to include(
          "offset" => 0,
          "startDate" => start0.to_s,
          "endDate" => end0.to_s
        )

        expect(json["summary"]).to include(
          "totalDays" => 4,
          "uniqueResorts" => 2,
          "longestStreak" => 3
        )

        expect(json).to include(
          "totalDays" => 4,
          "uniqueResorts" => 2,
          "mostUsedSki" => "Atomic Redster G9, 181"
        )

        expect(json["resorts"].first).to include(
          "name" => "Zermatt",
          "country" => "Switzerland",
          "latitude" => 46.0207,
          "longitude" => 7.7491,
          "daysSkied" => 3
        )

        expect(json["daysPerMonth"]).to include(hash_including("month" => "Feb", "days" => 4))

        tag_names = json["tags"].map { |t| t["name"] }
        expect(tag_names).to include("Powder", "Groomed")

        ski_names = json["skis"].map { |s| s["name"] }
        expect(ski_names).to include("Atomic Redster G9, 181", "Fischer Ranger 102")

        get api_v1_stats_path, params: { season: -1 }
        json2 = JSON.parse(response.body)
        expect(json2["season"]).to include(
          "offset" => -1,
          "startDate" => start1.to_s,
          "endDate" => end1.to_s
        )
        expect(json2["summary"]["totalDays"]).to eq(2)
      end
    end
  end
end
