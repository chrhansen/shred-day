class PasswordResetMailer < ApplicationMailer
  def reset
    @reset_url = "#{reset_origin}/reset-password#token=#{params.fetch(:reset_token)}"
    mail(to: params.fetch(:user).email, subject: "Reset your Shred.Day password")
  end

  class << self
    private

    def set_payload_for_mail(payload, message)
      super
      payload[:mail] = "[FILTERED password reset email]"
      payload[:to] = [ "[FILTERED]" ]
    end
  end

  private

  def reset_origin
    return "https://shred.day" if Rails.env.production?
    return "https://example.com" if Rails.env.test?

    "http://localhost:8080"
  end
end
