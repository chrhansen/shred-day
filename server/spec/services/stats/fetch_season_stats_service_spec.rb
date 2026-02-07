require "rails_helper"

RSpec.describe Stats::FetchSeasonStatsService do
  include ActiveSupport::Testing::TimeHelpers

  let!(:user) { create(:user, season_start_day: "09-01") }
  let(:converter) { OffsetDateRangeConverterService.new(user.season_start_day) }

  around do |example|
    travel_to(Time.zone.parse("2026-02-07 12:00:00 UTC")) { example.run }
  end

  describe "#fetch_stats" do
    it "returns season-scoped aggregates" do
      start0, end0 = converter.date_range(0)
      start1, _end1 = converter.date_range(-1)

      resort1 = create(:resort, name: "Zermatt", country: "Switzerland", latitude: 46.0207, longitude: 7.7491)
      resort2 = create(:resort, name: "Chamonix", country: "France", latitude: 45.9237, longitude: 6.8694)

      ski1 = create(:ski, user: user, name: "Atomic Redster G9, 181")
      ski2 = create(:ski, user: user, name: "Fischer Ranger 102")

      create(:day, :with_tags, user: user, resort: resort1, skis: [ski1], date: Date.current - 2, tag_names: ["Powder"])
      create(:day, :with_tags, user: user, resort: resort1, skis: [ski1], date: Date.current - 1, tag_names: ["Powder", "Groomed"])
      create(:day, :with_tags, user: user, resort: resort2, skis: [ski2], date: Date.current, tag_names: ["Groomed"])

      # Outside season 0 (and inside season -1)
      create(:day, user: user, resort: resort2, skis: [ski2], date: start1 + 1.day)
      create(:day, user: user, resort: resort2, skis: [ski2], date: start0 - 1.day)

      result = described_class.new(user, season_offset: 0).fetch_stats

      expect(result).to be_fetched
      expect(result.season).to include(
        offset: 0,
        startDate: start0.to_s,
        endDate: end0.to_s
      )

      expect(result.summary).to include(totalDays: 3, uniqueResorts: 2, currentStreak: 3)
      expect(result.days_per_month).to include(hash_including(month: "Feb", days: 3))

      expect(result.resorts.first).to include(
        name: "Zermatt",
        country: "Switzerland",
        latitude: 46.0207,
        longitude: 7.7491,
        daysSkied: 2
      )

      expect(result.tags.map { |row| row[:name] }).to include("Powder", "Groomed")
      expect(result.skis.map { |row| row[:name] }).to include("Atomic Redster G9, 181", "Fischer Ranger 102")
    end

    it "scopes results by season_offset" do
      start0, _end0 = converter.date_range(0)
      start1, _end1 = converter.date_range(-1)

      resort = create(:resort)
      ski = create(:ski, user: user)

      create(:day, user: user, resort: resort, skis: [ski], date: start0 + 10.days)
      create(:day, user: user, resort: resort, skis: [ski], date: start1 + 10.days)

      result0 = described_class.new(user, season_offset: 0).fetch_stats
      result1 = described_class.new(user, season_offset: -1).fetch_stats

      expect(result0.summary[:totalDays]).to eq(1)
      expect(result1.summary[:totalDays]).to eq(1)
    end
  end
end
