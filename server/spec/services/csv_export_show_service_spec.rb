require 'rails_helper'

RSpec.describe CsvExportShowService do
  include ActiveSupport::Testing::TimeHelpers

  let!(:user) { create(:user, season_start_day: "09-01") }
  let(:offset_converter) { OffsetDateRangeConverterService.new(user.season_start_day) }

  describe '#fetch_seasons_and_columns' do
    around(:each) do |example|
      travel_to Date.new(2023, 10, 15) do
        example.run
      end
    end

    context 'when user has ski days' do
      before do
        current_season_range = offset_converter.date_range(0) # Sep 1, 2023 - Aug 31, 2024
        last_season_range = offset_converter.date_range(-1)   # Sep 1, 2022 - Aug 31, 2023

        create(:day, user: user, date: current_season_range[0] + 10.days) # 1 day in current
        create_list(:day, 3, user: user, date: last_season_range[0] + 20.days) # 3 days in last
        two_seasons_ago_range = offset_converter.date_range(-2) # Sep 1, 2021 - Aug 31, 2022
        create(:day, user: user, date: two_seasons_ago_range[0] + 5.days) # 1 day two seasons ago
      end

      it 'returns a hash with correct seasons and columns data' do
        service = described_class.new(user)
        result = service.fetch_seasons_and_columns

        expect(result).to be_a(Hash)
        expect(result).to have_key(:seasons)
        expect(result).to have_key(:columns)

        # Expecting seasons 0, -1, -2 based on created days. Order might vary from AvailableSeasonsService.
        expect(result[:seasons].map { |s| s[:id] }).to match_array(["0", "-1", "-2"])

        current_season_info = result[:seasons].find { |s| s[:id] == "0" }
        expect(current_season_info).to be_present
        expect(current_season_info[:day_count]).to eq(1)

        last_season_info = result[:seasons].find { |s| s[:id] == "-1" }
        expect(last_season_info).to be_present
        expect(last_season_info[:day_count]).to eq(3)

        two_seasons_ago_info = result[:seasons].find { |s| s[:id] == "-2" }
        expect(two_seasons_ago_info).to be_present
        expect(two_seasons_ago_info[:day_count]).to eq(1)

        expected_columns = [
          { id: 'date', label: 'Date', enabled: true },
          { id: 'resort_name', label: 'Resort', enabled: true },
          { id: 'resort_country', label: 'Country', enabled: false },
          { id: 'skis', label: 'Skis', enabled: true },
          { id: 'activity', label: 'Activity', enabled: true },
          { id: 'season', label: 'Season', enabled: false },
          { id: 'day_number', label: 'Season Day #', enabled: true },
          { id: 'day_id', label: 'Shred Day ID', enabled: false },
          { id: 'notes', label: 'Notes', enabled: false },
          { id: 'photo_count', label: 'Photo Count', enabled: false }
        ].map(&:deep_symbolize_keys)

        expect(result[:columns].map(&:deep_symbolize_keys)).to match_array(expected_columns)
      end
    end

    context 'when user has no ski days' do
      it 'returns season 0 with 0 day_count and default columns' do
        service = described_class.new(user)
        result = service.fetch_seasons_and_columns

        expect(result[:seasons].size).to eq(1)
        expect(result[:seasons][0][:id]).to eq("0")
        expect(result[:seasons][0][:day_count]).to eq(0)

        expected_columns = [
          { id: 'date', label: 'Date', enabled: true },
          { id: 'resort_name', label: 'Resort', enabled: true },
          { id: 'resort_country', label: 'Country', enabled: false },
          { id: 'skis', label: 'Skis', enabled: true },
          { id: 'activity', label: 'Activity', enabled: true },
          { id: 'season', label: 'Season', enabled: false },
          { id: 'day_number', label: 'Season Day #', enabled: true },
          { id: 'day_id', label: 'Shred Day ID', enabled: false },
          { id: 'notes', label: 'Notes', enabled: false },
          { id: 'photo_count', label: 'Photo Count', enabled: false }
        ].map(&:deep_symbolize_keys)
        expect(result[:columns].map(&:deep_symbolize_keys)).to match_array(expected_columns)
      end
    end
  end
end
