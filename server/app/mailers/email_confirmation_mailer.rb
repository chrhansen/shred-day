class EmailConfirmationMailer < ApplicationMailer
  def confirmation
    @confirmation_url = "#{confirmation_origin}/confirm-email#token=#{params.fetch(:confirmation_token)}"
    mail(to: params.fetch(:user).email, subject: "Confirm your email for Shred.Day")
  end

  class << self
    private

    def set_payload_for_mail(payload, message)
      super
      payload[:mail] = "[FILTERED confirmation email]"
      payload[:to] = [ "[FILTERED]" ]
    end
  end

  private

  def confirmation_origin
    return "https://shred.day" if Rails.env.production?
    return "https://example.com" if Rails.env.test?
    "http://localhost:8080"
  end
end
