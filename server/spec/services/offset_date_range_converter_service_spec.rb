require 'rails_helper'

RSpec.describe OffsetDateRangeConverterService do
  include ActiveSupport::Testing::TimeHelpers
  # Helper to provide a consistent "today" for tests
  around(:each) do |example|
    # Travel to a date where "this season" (08-15 start) is clearly defined
    # e.g., if today is Oct 15, 2023, this season (08-15) started Aug 15, 2023
    travel_to Date.new(2023, 10, 15) do
      example.run
    end
  end

  describe '#date_range' do
    context 'when season starts 08-15' do
      subject { described_class.new("08-15") }

      it 'returns the correct date range for offset 0 (current season)' do
        # Traveled to Oct 15, 2023. Current season (08-15) is Aug 15, 2023 - Aug 14, 2024
        expect(subject.date_range(0)).to eq([Date.new(2023, 8, 15), Date.new(2024, 8, 14)])
      end

      it 'returns the correct date range for offset -1 (last season)' do
        expect(subject.date_range(-1)).to eq([Date.new(2022, 8, 15), Date.new(2023, 8, 14)])
      end

      it 'returns the correct date range for offset -2 (two seasons ago)' do
        expect(subject.date_range(-2)).to eq([Date.new(2021, 8, 15), Date.new(2022, 8, 14)])
      end

      it 'returns the correct date range for offset 1 (next season)' do
        expect(subject.date_range(1)).to eq([Date.new(2024, 8, 15), Date.new(2025, 8, 14)])
      end

      it 'returns the correct date range for offset 2 (two seasons in future)' do
        expect(subject.date_range(2)).to eq([Date.new(2025, 8, 15), Date.new(2026, 8, 14)])
      end
    end

    context 'when season starts 01-01' do
      subject { described_class.new("01-01") }
      # Traveled to Oct 15, 2023. Current season (01-01) is Jan 1, 2023 - Dec 31, 2023

      it 'returns the correct date range for offset 0' do
        expect(subject.date_range(0)).to eq([Date.new(2023, 1, 1), Date.new(2023, 12, 31)])
      end

      it 'returns the correct date range for offset -1' do
        expect(subject.date_range(-1)).to eq([Date.new(2022, 1, 1), Date.new(2022, 12, 31)])
      end

      it 'returns the correct date range for offset 1' do
        expect(subject.date_range(1)).to eq([Date.new(2024, 1, 1), Date.new(2024, 12, 31)])
      end
    end
  end

  describe '#season_offset' do
    context 'when season starts 09-01' do
      subject { described_class.new("09-01") }
      # Traveled to Oct 15, 2023. Current season (09-01) is Sep 1, 2023 - Aug 31, 2024

      it 'returns 0 for a date in the middle of the current season' do
        expect(subject.season_offset(Date.new(2023, 12, 25))).to eq(0)
      end

      it 'returns 0 for the first day of the current season' do
        expect(subject.season_offset(Date.new(2023, 9, 1))).to eq(0)
      end

      it 'returns 0 for the last day of the current season' do
        expect(subject.season_offset(Date.new(2024, 8, 31))).to eq(0)
      end

      it 'returns -1 for a date in the middle of the previous season' do
        expect(subject.season_offset(Date.new(2022, 11, 1))).to eq(-1)
      end

      it 'returns -1 for the first day of the previous season' do
        expect(subject.season_offset(Date.new(2022, 9, 1))).to eq(-1)
      end

      it 'returns -1 for the last day of the previous season' do
        expect(subject.season_offset(Date.new(2023, 8, 31))).to eq(-1)
      end

      it 'returns -5 for a date five seasons ago' do
        expect(subject.season_offset(Date.new(2018, 10, 10))).to eq(-5)
      end

      it 'returns +1 for a date in the next season' do
        # Date is Oct 1, 2024. Current season (offset 0) ends Aug 31, 2024.
        # This date is in the season starting Sep 1, 2024 (offset +1).
        expect(subject.season_offset(Date.new(2024, 10, 1))).to eq(1)
      end

      it 'returns +1 for the first day of the next season' do
        # Current season ends Aug 31, 2024. Next season starts Sep 1, 2024.
        expect(subject.season_offset(Date.new(2024, 9, 1))).to eq(1)
      end

      it 'returns +2 for a date two seasons in the future' do
        expect(subject.season_offset(Date.new(2025, 11, 15))).to eq(2)
      end

      it 'returns a very old offset correctly' do
        expect(subject.season_offset(Date.new(1923, 9, 15))).to eq(-100)
      end

      it 'returns a very future offset correctly' do
        expect(subject.season_offset(Date.new(2123, 9, 15))).to eq(100)
      end
    end

    context 'when season starts 03-01' do
      subject { described_class.new("03-01") }
      # Traveled to Oct 15, 2023. Current season (03-01) is Mar 1, 2023 - Feb 29, 2024 (leap year if applicable)

      it 'returns 0 for a date in current season (after Oct 15, 2023)' do
        expect(subject.season_offset(Date.new(2024, 1, 15))).to eq(0)
      end

      it 'returns 0 for a date in current season (before Oct 15, 2023)' do
        expect(subject.season_offset(Date.new(2023, 7, 1))).to eq(0)
      end

      it 'returns -1 for a date in previous season' do
        expect(subject.season_offset(Date.new(2022, 5, 5))).to eq(-1)
      end

      it 'returns +1 for a date in next season' do
        # Next season starts Mar 1, 2024
        expect(subject.season_offset(Date.new(2024, 5, 5))).to eq(1)
      end
    end
  end
end
