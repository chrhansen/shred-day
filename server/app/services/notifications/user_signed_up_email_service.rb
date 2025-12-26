class Notifications::UserSignedUpEmailService
  def initialize(user)
    @user = user
    @notification_email = ENV["RESEND_NOTIFICATION_EMAIL"]
  end

  def send_notification
    return Result.new(false, "Notification email missing") if @notification_email.blank?

    html = <<~HTML
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #0f172a; border-bottom: 2px solid #0ea5e9; padding-bottom: 10px;">
          New Shred Day Signup
        </h2>
        <p style="color: #334155; font-size: 16px; line-height: 1.5;">
          A new user just signed up.
        </p>
        <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0 0 8px 0;"><strong>Email:</strong> #{@user.email}</p>
          <p style="margin: 0;"><strong>User ID:</strong> #{@user.id}</p>
        </div>
      </div>
    HTML

    result = ResendEmailService.new.send_email(
      to: @notification_email,
      subject: "New user signup - Shred Day",
      html: html
    )

    Result.new(result.sent?, result.error)
  end

  class Result
    attr_reader :error

    def initialize(sent, error)
      @sent = sent
      @error = error
    end

    def sent?
      @sent
    end
  end
end
