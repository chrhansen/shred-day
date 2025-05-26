require 'rails_helper'

RSpec.describe AccountUpdateService do
  let(:initial_season_start_day) { "08-15" }
  let!(:user) { create(:user, season_start_day: initial_season_start_day, email: "original@example.com") }

  # Setup: Days spanning two seasons based on initial_season_start_day
  # Season 1 example (assuming initial_season_start_day = "08-15"): 2022-08-15 to 2023-08-14
  let!(:day_in_season1) { create(:day, user: user, date: Date.parse("2022-10-15")) }
  # Season 2 example: 2023-08-15 to 2024-08-14
  let!(:day_in_season2) { create(:day, user: user, date: Date.parse("2023-10-15")) }

  let(:all_user_day_dates) { [day_in_season1.date, day_in_season2.date] }

  # Stub DayNumberUpdaterService
  let(:day_number_updater_service_instance) { instance_double(DayNumberUpdaterService, update!: true) }

  before do
    allow(DayNumberUpdaterService).to receive(:new).and_return(day_number_updater_service_instance)
  end

  describe '#update' do
    context 'when season_start_day is NOT changed' do
      let(:params_without_season_change) { { email: "new@example.com" } }

      it 'updates other user attributes' do
        service = AccountUpdateService.new(user, params_without_season_change)
        service.update
        expect(user.reload.email).to eq("new@example.com")
      end

      it 'calls DayNumberUpdaterService with empty affected_dates when season_start_day is not in params' do
        service = AccountUpdateService.new(user, params_without_season_change)
        service.update
        expect(DayNumberUpdaterService).to have_received(:new).with(user: user, affected_dates: [])
        expect(day_number_updater_service_instance).to have_received(:update!)
      end

      it 'calls DayNumberUpdaterService with empty affected_dates when season_start_day param is present but unchanged' do
        params_with_same_season_day = { email: "another@example.com", season_start_day: initial_season_start_day }
        service = AccountUpdateService.new(user, params_with_same_season_day)
        service.update
        expect(user.reload.email).to eq("another@example.com") # Ensure other attributes can still update
        expect(user.reload.season_start_day).to eq(initial_season_start_day) # Ensure it truly didn't change
        expect(DayNumberUpdaterService).to have_received(:new).with(user: user, affected_dates: [])
        expect(day_number_updater_service_instance).to have_received(:update!).at_least(:once) # Could be called multiple times due to previous test in context
      end

      it 'returns a successful result' do
        service = AccountUpdateService.new(user, params_without_season_change)
        result = service.update
        expect(result).to be_updated
        expect(result.user).to eq(user)
        expect(result.errors).to be_nil
      end
    end

    context 'when season_start_day IS changed' do
      let(:new_season_start_day) { "01-01" }
      let(:params_with_season_change) { { season_start_day: new_season_start_day } }

      it 'updates and persists the user\'s season_start_day' do
        service = AccountUpdateService.new(user, params_with_season_change)
        service.update
        expect(user.reload.season_start_day).to eq(new_season_start_day)
      end

      it 'calls DayNumberUpdaterService with all existing day dates for the user' do
        service = AccountUpdateService.new(user, params_with_season_change)
        service.update
        expect(DayNumberUpdaterService).to have_received(:new).with(user: user, affected_dates: match_array(all_user_day_dates))
        expect(day_number_updater_service_instance).to have_received(:update!)
      end

      it 'returns a successful result' do
        service = AccountUpdateService.new(user, params_with_season_change)
        result = service.update
        expect(result).to be_updated
        expect(result.user).to eq(user)
        expect(result.errors).to be_nil
      end
    end

    context 'when user update fails (e.g., validation error)' do
      # Assuming User model validates presence of email
      let(:invalid_params) { { email: "" } }

      it 'does not save the user changes' do
        original_email = user.email
        service = AccountUpdateService.new(user, invalid_params)
        service.update
        expect(user.reload.email).to eq(original_email)
      end

      it 'does NOT call DayNumberUpdaterService' do
        service = AccountUpdateService.new(user, invalid_params)
        service.update
        expect(DayNumberUpdaterService).not_to have_received(:new)
      end

      it 'returns an unsuccessful result with errors' do
        service = AccountUpdateService.new(user, invalid_params)
        result = service.update
        expect(result).not_to be_updated
        expect(result.user).to eq(user)
        expect(result.errors).not_to be_empty
      end
    end
  end
end
