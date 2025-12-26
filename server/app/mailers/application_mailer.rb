class ApplicationMailer < ActionMailer::Base
  DEFAULT_FROM_EMAIL = "Shred Day <hello@shred.day>"
  DEFAULT_NOTIFICATION_EMAIL = "ops@shred.day"

  default from: DEFAULT_FROM_EMAIL
  layout "mailer"

  private

  def notification_email
    DEFAULT_NOTIFICATION_EMAIL
  end
end
