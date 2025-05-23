require 'rails_helper'

RSpec.describe AvailableSeasonsService do
  let!(:resort) { create(:resort) } # Keep resort and ski for day creation in tests
  let!(:ski) { create(:ski, user: user) } # Associated with the user defined in each context

  describe '#fetch_available_seasons' do
    context "when user has no days" do
      let(:user) { create(:user, season_start_day: "09-01") }
      it "returns [0] (current season only)" do
        available_seasons = AvailableSeasonsService.new(user).fetch_available_seasons
        expect(available_seasons).to eq([0])
      end
    end

    context "when user has days across multiple seasons with gaps" do
      let(:user) { create(:user, season_start_day: "10-01") } # October 1st season start

      before do
        # Create days across different seasons with gaps
        # Current season (2024-2025): November 2024
        create(:day, user: user, date: Date.new(2024, 11, 15), resort: resort, skis: [ski])

        # Previous season (2023-2024): December 2023
        create(:day, user: user, date: Date.new(2023, 12, 10), resort: resort, skis: [ski])

        # Gap year (2022-2023): No days

        # Two seasons ago (2021-2022): January 2022
        create(:day, user: user, date: Date.new(2022, 1, 20), resort: resort, skis: [ski])

        # Three seasons ago (2020-2021): February 2021
        create(:day, user: user, date: Date.new(2021, 2, 5), resort: resort, skis: [ski])
      end

      it "calculates available_seasons correctly with gaps" do
        # Mock current date to be within 2024-2025 season
        allow(Date).to receive(:current).and_return(Date.new(2024, 12, 1))

        available_seasons = AvailableSeasonsService.new(user).fetch_available_seasons

        # Should include: 0 (current), -1 (previous), -3 (two seasons ago), -4 (three seasons ago)
        # Should NOT include -2 (gap year)
        # Should be sorted in reverse order (most recent first)
        expect(available_seasons).to eq([0, -1, -3, -4])
      end

      it "always includes current season (0) even when no current season days exist" do
        # Remove the current season day
        user.days.where(date: Date.new(2024, 11, 15)).destroy_all

        allow(Date).to receive(:current).and_return(Date.new(2024, 12, 1))

        available_seasons = AvailableSeasonsService.new(user).fetch_available_seasons

        # Should still include 0 even though no current season days exist
        expect(available_seasons).to include(0)
        expect(available_seasons).to eq([0, -1, -3, -4])
      end
    end

    context "with different season start dates" do
      let(:user) { create(:user, season_start_day: "04-01") } # April 1st season start

      before do
        # Create days for southern hemisphere skiing
        # Current season (2024-2025): May 2024 and January 2025
        create(:day, user: user, date: Date.new(2024, 5, 15), resort: resort, skis: [ski])
        create(:day, user: user, date: Date.new(2025, 1, 10), resort: resort, skis: [ski])

        # Previous season (2023-2024): June 2023
        create(:day, user: user, date: Date.new(2023, 6, 20), resort: resort, skis: [ski])
      end

      it "calculates seasons correctly for non-standard season start dates" do
        allow(Date).to receive(:current).and_return(Date.new(2025, 2, 1))

        available_seasons = AvailableSeasonsService.new(user).fetch_available_seasons

        # Current season should include both May 2024 and January 2025 days
        # Previous season should include June 2023 day
        expect(available_seasons).to eq([0, -1])
      end
    end

    context "edge cases" do
      let(:user) { create(:user, season_start_day: "12-31") } # December 31st season start

      before do
        # Day exactly on season boundary
        create(:day, user: user, date: Date.new(2023, 12, 31), resort: resort, skis: [ski])
      end

      it "handles days exactly on season start date" do
        allow(Date).to receive(:current).and_return(Date.new(2024, 6, 1))

        available_seasons = AvailableSeasonsService.new(user).fetch_available_seasons

        # The day on 2023-12-31 should be included in the current season (0)
        # since current season 2023-2024 started on 2023-12-31
        expect(available_seasons).to include(0)
        expect(available_seasons).to eq([0])
      end
    end
  end
end
