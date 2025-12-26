class Notifications::DayCreatedEmailService
  def initialize(day)
    @day = day
    @notification_email = ENV["RESEND_NOTIFICATION_EMAIL"]
  end

  def send_notification
    return Result.new(false, "Notification email missing") if @notification_email.blank?

    resort_name = @day.resort&.name || "Unknown resort"
    html = <<~HTML
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #0f172a; border-bottom: 2px solid #22c55e; padding-bottom: 10px;">
          New Day Logged
        </h2>
        <p style="color: #334155; font-size: 16px; line-height: 1.5;">
          A new day was created in Shred Day.
        </p>
        <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0 0 8px 0;"><strong>User:</strong> #{@day.user.email}</p>
          <p style="margin: 0 0 8px 0;"><strong>Date:</strong> #{@day.date}</p>
          <p style="margin: 0 0 8px 0;"><strong>Resort:</strong> #{resort_name}</p>
          <p style="margin: 0;"><strong>Day ID:</strong> #{@day.id}</p>
        </div>
      </div>
    HTML

    result = ResendEmailService.new.send_email(
      to: @notification_email,
      subject: "New day logged - Shred Day",
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
