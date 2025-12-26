class ApplicationMailer < ActionMailer::Base
  DEFAULT_FROM_EMAIL = Rails.application.credentials.dig(:mailer, :from_email) || "Shred Day <hello@shred.day>"
  DEFAULT_NOTIFICATION_EMAIL = Rails.application.credentials.dig(:mailer, :notification_email) || "ops@shred.day"

  default from: DEFAULT_FROM_EMAIL
  layout "mailer"

  private

  def notification_email
    DEFAULT_NOTIFICATION_EMAIL
  end
end
