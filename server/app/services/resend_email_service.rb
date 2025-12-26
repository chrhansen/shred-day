require "net/http"
require "json"

class ResendEmailService
  RESEND_ENDPOINT = URI("https://api.resend.com/emails").freeze

  def initialize(api_key: ENV["RESEND_API_KEY"], from_email: ENV["RESEND_FROM_EMAIL"])
    @api_key = api_key
    @from_email = from_email
  end

  def send_email(to:, subject:, html:, text: nil)
    return Result.new(false, "Resend API key missing") if @api_key.blank?
    return Result.new(false, "Resend from email missing") if @from_email.blank?

    recipients = Array(to).compact
    return Result.new(false, "Recipient email missing") if recipients.empty?

    payload = {
      from: @from_email,
      to: recipients,
      subject: subject,
      html: html
    }
    payload[:text] = text if text.present?

    response = Net::HTTP.start(RESEND_ENDPOINT.host, RESEND_ENDPOINT.port, use_ssl: true) do |http|
      request = Net::HTTP::Post.new(RESEND_ENDPOINT)
      request["Authorization"] = "Bearer #{@api_key}"
      request["Content-Type"] = "application/json"
      request.body = JSON.generate(payload)
      http.request(request)
    end

    if response.is_a?(Net::HTTPSuccess)
      body = JSON.parse(response.body) rescue {}
      Result.new(true, body["id"])
    else
      Result.new(false, response.body)
    end
  rescue StandardError => e
    Result.new(false, e.message)
  end

  class Result
    attr_reader :reference, :error

    def initialize(sent, reference_or_error)
      @sent = sent
      if sent
        @reference = reference_or_error
      else
        @error = reference_or_error
      end
    end

    def sent?
      @sent
    end
  end
end
