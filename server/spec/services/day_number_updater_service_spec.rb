require 'rails_helper'

RSpec.describe DayNumberUpdaterService do
  let(:user) { create(:user, season_start_day: "08-15") } # Season starts August 15th

  describe '#update!' do
    context 'with multiple days in a single season' do
      let!(:day1) { create(:day, user: user, date: "2023-08-20", created_at: Time.zone.parse("2023-08-20 10:00:00")) }
      let!(:day2) { create(:day, user: user, date: "2023-08-15", created_at: Time.zone.parse("2023-08-15 09:00:00")) }
      let!(:day3) { create(:day, user: user, date: "2023-08-20", created_at: Time.zone.parse("2023-08-20 08:00:00")) }

      it 'orders days correctly by date, then by created_at' do
        DayNumberUpdaterService.new(user: user, affected_dates: [day1.date, day2.date, day3.date]).update!

        expect(day1.reload.day_number).to eq(3)
        expect(day2.reload.day_number).to eq(1)
        expect(day3.reload.day_number).to eq(2)
      end
    end

    context 'with days spanning multiple seasons' do
      # Season 1: 2022-08-15 to 2023-08-14 (user.season_start_day: "08-15")
      let!(:s1_day1) { create(:day, user: user, date: "2022-09-01") }
      let!(:s1_day2) { create(:day, user: user, date: "2023-01-15") }

      # Season 2: 2023-08-15 to 2024-08-14
      let!(:s2_day1) { create(:day, user: user, date: "2023-08-15") } # First day of season
      let!(:s2_day2) { create(:day, user: user, date: "2024-08-14") } # Last day of season
      let!(:s2_day3) { create(:day, user: user, date: "2023-12-25") }

      before do
        DayNumberUpdaterService.new(user: user, affected_dates: [s1_day1.date, s1_day2.date, s2_day1.date, s2_day2.date, s2_day3.date]).update!
      end

      it 'assigns correct day numbers for the first season' do
        expect(s1_day1.reload.day_number).to eq(1)
        expect(s1_day2.reload.day_number).to eq(2)
      end

      it 'assigns correct day numbers for the second season' do
        expect(s2_day1.reload.day_number).to eq(1)
        expect(s2_day3.reload.day_number).to eq(2)
        expect(s2_day2.reload.day_number).to eq(3)
      end

      it 'maintains correct day_numbers when a new day is added to a season' do
        s1_new_day = create(:day, user: user, date: "2022-10-10")
        DayNumberUpdaterService.new(user: user, affected_dates: [s1_new_day.date]).update!

        expect(s1_day1.reload.day_number).to eq(1)
        expect(s1_new_day.reload.day_number).to eq(2)
        expect(s1_day2.reload.day_number).to eq(3)

        expect(s2_day1.reload.day_number).to eq(1)
        expect(s2_day3.reload.day_number).to eq(2)
        expect(s2_day2.reload.day_number).to eq(3)

        DayNumberUpdaterService.new(user: user, affected_dates: [s2_day1.date]).update!
        expect(s2_day1.reload.day_number).to eq(1)
        expect(s2_day3.reload.day_number).to eq(2)
        expect(s2_day2.reload.day_number).to eq(3)
      end
    end

    context 'when a day changes season' do
      let!(:s1_day1) { create(:day, user: user, date: "2023-09-01") }
      let!(:s1_day_to_move) { create(:day, user: user, date: "2023-10-01") }
      let!(:s1_day3) { create(:day, user: user, date: "2023-11-01") }
      let!(:s2_day1) { create(:day, user: user, date: "2024-09-01") }

      before do
        DayNumberUpdaterService.new(user: user, affected_dates: [s1_day1.date, s1_day_to_move.date, s1_day3.date, s2_day1.date]).update!
      end

      it 'updates day numbers correctly in both seasons after a day moves' do
        expect(s1_day1.reload.day_number).to eq(1)
        expect(s1_day_to_move.reload.day_number).to eq(2)
        expect(s1_day3.reload.day_number).to eq(3)
        expect(s2_day1.reload.day_number).to eq(1)

        original_date_of_moved_day = s1_day_to_move.date
        new_date_for_moved_day = Date.parse("2024-10-01")
        s1_day_to_move.update!(date: new_date_for_moved_day)

        DayNumberUpdaterService.new(user: user, affected_dates: [original_date_of_moved_day, new_date_for_moved_day]).update!

        expect(s1_day1.reload.day_number).to eq(1)
        expect(s1_day3.reload.day_number).to eq(2)

        expect(s2_day1.reload.day_number).to eq(1)
        expect(s1_day_to_move.reload.day_number).to eq(2)
      end
    end

    context 'with days on season boundaries' do
      let!(:day_on_first_day_of_season) { create(:day, user: user, date: "2023-08-15") }
      let!(:day_on_last_day_of_season) { create(:day, user: user, date: "2024-08-14") }
      let!(:day_before_season_starts) { create(:day, user: user, date: "2023-08-14") }
      let!(:day_after_season_ends) { create(:day, user: user, date: "2024-08-15") }

      it 'correctly assigns day_number for days on exact season start/end dates' do
        DayNumberUpdaterService.new(user: user, affected_dates: [day_on_first_day_of_season.date, day_on_last_day_of_season.date]).update!

        expect(day_on_first_day_of_season.reload.day_number).to eq(1)
        expect(day_on_last_day_of_season.reload.day_number).to eq(2)
      end

      it 'does not assign day_number from the current test season to days outside it' do
        DayNumberUpdaterService.new(user: user, affected_dates: [day_on_first_day_of_season.date, day_on_last_day_of_season.date]).update!

        expect(day_before_season_starts.reload.day_number).to be_nil
        expect(day_after_season_ends.reload.day_number).to be_nil

        DayNumberUpdaterService.new(user: user, affected_dates: [day_before_season_starts.date]).update!
        expect(day_before_season_starts.reload.day_number).to eq(1)

        DayNumberUpdaterService.new(user: user, affected_dates: [day_after_season_ends.date]).update!
        expect(day_after_season_ends.reload.day_number).to eq(1)
      end
    end

    context 'when no days exist for the user in the season' do
      it 'does not raise an error and does nothing' do
        expect {
          DayNumberUpdaterService.new(user: user, affected_dates: [Date.parse("2050-08-15")]).update!
        }.not_to raise_error
      end
    end

    context 'when user\'s season_start_day changes' do
      let!(:day_before_original_season) { create(:day, user: user, date: "2023-07-20") }
      let!(:day_in_original_season) { create(:day, user: user, date: "2023-08-20") }

      it 'recalculates based on the new season start date' do
        DayNumberUpdaterService.new(user: user, affected_dates: [day_in_original_season.date]).update!

        expect(day_before_original_season.reload.day_number).to be_nil
        expect(day_in_original_season.reload.day_number).to eq(1)

        user.update!(season_start_day: "07-01")

        DayNumberUpdaterService.new(user: user, affected_dates: [day_before_original_season.date, day_in_original_season.date]).update!

        expect(day_before_original_season.reload.day_number).to eq(1)
        expect(day_in_original_season.reload.day_number).to eq(2)
      end
    end
  end
end
