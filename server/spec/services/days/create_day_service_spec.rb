require "rails_helper"

RSpec.describe Days::CreateDayService do
  let(:user) { create(:user) }
  let(:resort) { create(:resort) }
  let(:params) { { date: Date.today, resort_id: resort.id, notes: "Powder day" } }
  let(:tag_result) { instance_double(Days::SyncTagsService::Result, synced?: true, errors: nil) }
  let(:tag_service) { instance_double(Days::SyncTagsService, sync: tag_result) }
  let(:day_number_updater) { instance_double(DayNumberUpdaterService, update!: true) }
  let(:notification_result) { instance_double(Notifications::DayCreatedEmailService::Result, sent?: true, error: nil) }
  let(:notification_service) { instance_double(Notifications::DayCreatedEmailService, send_notification: notification_result) }

  before do
    allow(Days::SyncTagsService).to receive(:new).and_return(tag_service)
    allow(DayNumberUpdaterService).to receive(:new).and_return(day_number_updater)
    allow(Notifications::DayCreatedEmailService).to receive(:new).and_return(notification_service)
  end

  it "creates a day and sends a notification" do
    result = described_class.new(user, params, tag_ids: []).create_day

    expect(result).to be_created
    expect(result.day).to be_persisted
    expect(Notifications::DayCreatedEmailService).to have_received(:new).with(result.day)
    expect(notification_service).to have_received(:send_notification)
  end

  it "does not send a notification when creation fails" do
    invalid_params = { date: Date.today, resort_id: nil }

    result = described_class.new(user, invalid_params, tag_ids: []).create_day

    expect(result).not_to be_created
    expect(Notifications::DayCreatedEmailService).not_to have_received(:new)
  end
end
