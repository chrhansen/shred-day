require "rails_helper"

RSpec.describe EmailConfirmationMailer, type: :mailer do
  it "keeps confirmation credentials out of mailer instrumentation and debug logs" do
    user = create(:user, :unconfirmed)
    token = SecureRandom.urlsafe_base64(32)
    events = []
    subscriber = ActiveSupport::Notifications.subscribe(/\A(?:process|deliver)\.action_mailer\z/) do |event|
      events << event.payload
    end
    described_class.with(user: user, confirmation_token: token).confirmation.deliver_now
    expect(events.size).to eq(2)
    expect(events.to_s).not_to include(token)
    expect(events.find { |payload| payload[:mail] }[:mail]).to eq("[FILTERED confirmation email]")
  ensure
    ActiveSupport::Notifications.unsubscribe(subscriber) if subscriber
  end
end
