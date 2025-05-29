require 'rails_helper'

RSpec.describe CsvExportCreateService do
  include ActiveSupport::Testing::TimeHelpers

  let!(:user) { create(:user, season_start_day: "09-01") }
  let(:offset_converter) { OffsetDateRangeConverterService.new(user.season_start_day) }
  let!(:resort1) { create(:resort, name: "Snowy Peaks") }
  let!(:ski1) { create(:ski, user: user, name: "Speedster XT") }
  let!(:ski2) { create(:ski, user: user, name: "AllMountain Pro") }

  # Prepare days within a consistent travel_to block for predictable day_numbers if service relies on Date.current
  let!(:day1) do
    travel_to Date.new(2023, 10, 15) do
      range = offset_converter.date_range(0) # Current season: Sep 1, 2023 - Aug 31, 2024
      d = create(:day, user: user, date: range[0] + 10.days, resort: resort1, skis: [ski1], activity: "Cruising")
      create_list(:photo, 2, day: d, user: user) # Add 2 photos to day1
      DayNumberUpdaterService.new(user: user, affected_dates: [d.date]).update! # Ensure day_number is set
      d.reload # Reload to get updated day_number
    end
  end
  let!(:day2) do
    travel_to Date.new(2023, 10, 15) do
      range = offset_converter.date_range(-1) # Last season: Sep 1, 2022 - Aug 31, 2023
      d = create(:day, user: user, date: range[0] + 20.days, resort: resort1, skis: [ski1, ski2], activity: "Exploring")
      DayNumberUpdaterService.new(user: user, affected_dates: [d.date]).update!
      d.reload
    end
  end

  describe '#create_csv_string' do
    let(:all_defined_columns) do # Matches CsvExportShowService and controller
      [
        { id: 'date', label: 'Date', enabled: true },
        { id: 'resort_name', label: 'Resort', enabled: true },
        { id: 'skis', label: 'Skis', enabled: true },
        { id: 'activity', label: 'Activity', enabled: true },
        { id: 'season', label: 'Season', enabled: true },
        { id: 'day_number', label: 'Day #', enabled: true },
        { id: 'day_id', label: 'Day ID', enabled: true },
        { id: 'notes', label: 'Notes', enabled: true },
        { id: 'photo_count', label: 'Photo Count', enabled: true }
      ].map { |c| c.deep_symbolize_keys } # Service expects symbolized keys for columns array elements
    end

    context 'with valid selections' do
      it 'returns a CSV string with correct headers and data for multiple seasons' do
        travel_to Date.new(2023, 10, 15) do # Consistent "today"
          service = described_class.new(user, [0, -1], all_defined_columns)
          result = service.create_csv_string

          expect(result.created?).to be true
          expect(result.error).to be_nil
          expect(result.csv_string).to be_a(String)

          csv_data = CSV.parse(result.csv_string)
          expect(csv_data.length).to eq(3) # Header + day1 + day2
          expect(csv_data[0]).to eq(all_defined_columns.map { |c| c[:label] })

          # Day1 data (offset 0)
          expect(csv_data[1]).to eq([
            day1.date.iso8601,
            resort1.name,
            ski1.name,
            day1.activity,
            "0", # Season offset for day1
            day1.day_number.to_s,
            day1.id.to_s,
            day1.notes, # Notes are nil by default from factory unless set
            "2"       # Photo count for day1
          ])

          # Day2 data (offset -1)
          expect(csv_data[2]).to eq([
            day2.date.iso8601,
            resort1.name,
            "#{ski1.name}, #{ski2.name}", # Skis joined
            day2.activity,
            "-1", # Season offset for day2
            day2.day_number.to_s,
            day2.id.to_s,
            day2.notes,
            "0"        # Photo count for day2
          ])
        end
      end

      it 'only includes enabled columns in the specified order' do
        travel_to Date.new(2023, 10, 15) do
          # Only date, activity, season are enabled, and in a different order
          custom_columns = [
            { id: 'activity', label: 'My Activity', enabled: "true" }, # Service checks for string "true"
            { id: 'skis', label: 'Skis Used', enabled: "false" },
            { id: 'season', label: 'The Season', enabled: "true" },
            { id: 'date', label: 'Ski Date', enabled: "true" }
          ].map(&:deep_symbolize_keys)

          service = described_class.new(user, [0], custom_columns)
          result = service.create_csv_string

          expect(result.created?).to be true
          csv_data = CSV.parse(result.csv_string)
          expect(csv_data.length).to eq(2) # Header + day1
          expect(csv_data[0]).to eq(["My Activity", "The Season", "Ski Date"])
          expect(csv_data[1]).to eq([day1.activity, "0", day1.date.iso8601])
        end
      end
    end

    context 'with invalid selections' do
      it 'returns error if no season_ids are provided' do
        service = described_class.new(user, [], all_defined_columns)
        result = service.create_csv_string
        expect(result.created?).to be false
        expect(result.csv_string).to be_nil
        expect(result.error).to eq("No seasons or columns selected for export.")
      end

      it 'returns error if season_ids contains only blank strings (after compact_blank)' do
        service = described_class.new(user, ["", " "], all_defined_columns) # Service compact_blanks this
        result = service.create_csv_string
        expect(result.created?).to be false
        expect(result.error).to eq("No seasons or columns selected for export.")
      end

      it 'returns error if no columns are enabled' do
        disabled_columns = all_defined_columns.map { |c| c.merge(enabled: "false") }
        service = described_class.new(user, [0], disabled_columns)
        result = service.create_csv_string
        expect(result.created?).to be false
        expect(result.csv_string).to be_nil
        expect(result.error).to eq("No seasons or columns selected for export.")
      end

      it 'returns error if columns array is empty' do
        service = described_class.new(user, [0], [])
        result = service.create_csv_string
        expect(result.created?).to be false
        expect(result.error).to eq("No seasons or columns selected for export.")
      end
    end
  end
end
