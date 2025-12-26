require "rails_helper"

RSpec.describe Notifications::UserSignedUpEmailService do
  let(:user) { create(:user, email: "newuser@example.com") }

  it "returns a failure when the notification email is missing" do
    original_email = ENV["RESEND_NOTIFICATION_EMAIL"]
    ENV["RESEND_NOTIFICATION_EMAIL"] = nil

    result = described_class.new(user).send_notification

    expect(result).not_to be_sent
    expect(result.error).to eq("Notification email missing")
  ensure
    ENV["RESEND_NOTIFICATION_EMAIL"] = original_email
  end

  it "sends a Resend email when configured" do
    original_email = ENV["RESEND_NOTIFICATION_EMAIL"]
    ENV["RESEND_NOTIFICATION_EMAIL"] = "ops@example.com"

    resend_result = instance_double(ResendEmailService::Result, sent?: true, error: nil)
    resend_service = instance_double(ResendEmailService, send_email: resend_result)
    allow(ResendEmailService).to receive(:new).and_return(resend_service)

    result = described_class.new(user).send_notification

    expect(result).to be_sent
    expect(ResendEmailService).to have_received(:new)
    expect(resend_service).to have_received(:send_email).with(
      hash_including(
        to: "ops@example.com",
        subject: "New user signup - Shred Day"
      )
    )
  ensure
    ENV["RESEND_NOTIFICATION_EMAIL"] = original_email
  end
end
