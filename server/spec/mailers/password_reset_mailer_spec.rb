require "rails_helper"

RSpec.describe PasswordResetMailer, type: :mailer do
  it "keeps reset credentials out of instrumentation and debug logs" do
    token = SecureRandom.urlsafe_base64(32)
    events = []
    subscriber = ActiveSupport::Notifications.subscribe(/\A(?:process|deliver)\.action_mailer\z/) { |event| events << event.payload }
    described_class.with(user: create(:user), reset_token: token).reset.deliver_now
    expect(events.size).to eq(2)
    expect(events.to_s).not_to include(token)
    expect(events.find { |payload| payload[:mail] }[:mail]).to eq("[FILTERED password reset email]")
  ensure
    ActiveSupport::Notifications.unsubscribe(subscriber) if subscriber
  end
end
