require "json"
require "net/http"
require "uri"

class MailjetDeliveryMethod
  MAILJET_SEND_ENDPOINT = "https://api.mailjet.com/v3.1/send"

  attr_reader :settings

  def initialize(settings = {})
    @settings = settings
  end

  def deliver!(mail)
    response = Net::HTTP.start(mailjet_uri.host, mailjet_uri.port, use_ssl: true) do |http|
      http.request(mailjet_request(mail))
    end

    return if response.is_a?(Net::HTTPSuccess) && delivery_successful?(response.body)

    raise "Mailjet delivery failed (#{response.code}): #{response.body}"
  end

  private

  def mailjet_request(mail)
    request = Net::HTTP::Post.new(mailjet_uri)
    request.basic_auth(api_key, secret_key)
    request["Content-Type"] = "application/json"
    request.body = JSON.dump(
      {
        Messages: [
          {
            From: from_payload(mail),
            To: to_payload(mail),
            Subject: mail.subject.to_s,
            HTMLPart: html_body(mail)
          }
        ]
      }
    )
    request
  end

  def mailjet_uri
    @mailjet_uri ||= URI.parse(MAILJET_SEND_ENDPOINT)
  end

  def api_key
    settings.fetch(:api_key)
  end

  def secret_key
    settings.fetch(:secret_key)
  end

  def from_payload(mail)
    from_address = Array(mail.from).first
    from_name = mail[:from]&.display_names&.first
    payload = { Email: from_address }
    payload[:Name] = from_name if from_name.present?
    payload
  end

  def to_payload(mail)
    Array(mail.to).map { |email| { Email: email } }
  end

  def html_body(mail)
    mail.html_part&.decoded.presence || mail.body.decoded
  end

  def delivery_successful?(response_body)
    body = JSON.parse(response_body)
    status = Array(body["Messages"]).first&.fetch("Status", nil)
    status == "success"
  rescue JSON::ParserError
    false
  end
end
