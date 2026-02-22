require "json"
require "net/http"
require "uri"

class ResendDeliveryMethod
  RESEND_SEND_ENDPOINT = "https://api.resend.com/emails"

  attr_reader :settings

  def initialize(settings = {})
    @settings = settings
  end

  def deliver!(mail)
    response = Net::HTTP.start(resend_uri.host, resend_uri.port, use_ssl: true) do |http|
      http.request(resend_request(mail))
    end

    return if response.is_a?(Net::HTTPSuccess) && delivery_successful?(response.body)

    raise "Resend delivery failed (#{response.code}): #{response.body}"
  end

  private

  def resend_request(mail)
    request = Net::HTTP::Post.new(resend_uri)
    request["Authorization"] = "Bearer #{api_key}"
    request["Content-Type"] = "application/json"
    request.body = JSON.dump(payload(mail))
    request
  end

  def resend_uri
    @resend_uri ||= URI.parse(RESEND_SEND_ENDPOINT)
  end

  def api_key
    settings.fetch(:api_key)
  end

  def payload(mail)
    {
      from: from_payload(mail),
      to: to_payload(mail),
      subject: mail.subject.to_s,
      html: html_body(mail)
    }.compact
  end

  def from_payload(mail)
    mail[:from]&.value.presence || Array(mail.from).first
  end

  def to_payload(mail)
    Array(mail.to)
  end

  def html_body(mail)
    mail.html_part&.decoded.presence || mail.body.decoded
  end

  def delivery_successful?(response_body)
    body = JSON.parse(response_body)
    body["id"].present?
  rescue JSON::ParserError
    false
  end
end
