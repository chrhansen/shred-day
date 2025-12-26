require "rails_helper"

RSpec.describe Days::CreateDayService do
  include ActiveJob::TestHelper

  let(:user) { create(:user) }
  let(:resort) { create(:resort) }
  let(:params) { { date: Date.today, resort_id: resort.id, notes: "Powder day" } }
  let(:tag_result) { instance_double(Days::SyncTagsService::Result, synced?: true, errors: nil) }
  let(:tag_service) { instance_double(Days::SyncTagsService, sync: tag_result) }
  let(:day_number_updater) { instance_double(DayNumberUpdaterService, update!: true) }

  before do
    ActiveJob::Base.queue_adapter = :test
    allow(Days::SyncTagsService).to receive(:new).and_return(tag_service)
    allow(DayNumberUpdaterService).to receive(:new).and_return(day_number_updater)
  end

  after do
    clear_enqueued_jobs
  end

  it "creates a day and sends a notification" do
    result = nil
    expect { result = described_class.new(user, params, tag_ids: []).create_day }
      .to have_enqueued_mail(UserMailer, :day_created_notification)

    expect(result).to be_created
    expect(result.day).to be_persisted
  end

  it "does not send a notification when creation fails" do
    invalid_params = { date: Date.today, resort_id: nil }

    result = nil
    expect { result = described_class.new(user, invalid_params, tag_ids: []).create_day }
      .not_to have_enqueued_mail(UserMailer, :day_created_notification)

    expect(result).not_to be_created
  end
end
