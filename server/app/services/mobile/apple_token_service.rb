require "jwt"
require "net/http"

class Mobile::AppleTokenService
  class ExchangeError < StandardError; end

  def exchange_code(code)
    raise ExchangeError, "Apple authorization code required" if code.blank?
    response = request("token", grant_type: "authorization_code", code: code)
    raise ExchangeError, "Apple did not return a refresh token" if response["refresh_token"].blank? || response["id_token"].blank?
    Result.new(response["refresh_token"], response["id_token"])
  end

  def revoke_token(token)
    request("revoke", token: token, token_type_hint: "refresh_token")
    Result.new(nil)
  end

  private

  def request(endpoint, values)
    uri = URI("https://appleid.apple.com/auth/#{endpoint}")
    request = Net::HTTP::Post.new(uri)
    request.set_form_data(values.merge(client_id: ENV.fetch("APPLE_BUNDLE_ID", "day.shred.app"), client_secret: client_secret))
    response = Net::HTTP.start(uri.host, uri.port, use_ssl: true, open_timeout: 5, read_timeout: 10) { |http| http.request(request) }
    raise ExchangeError, "Apple authorization could not be completed. Please try again." unless response.is_a?(Net::HTTPSuccess)
    response.body.present? ? JSON.parse(response.body) : {}
  rescue IOError, SystemCallError, Timeout::Error, JSON::ParserError
    raise ExchangeError, "Apple authorization is temporarily unavailable"
  end

  def client_secret
    team = ENV["APPLE_TEAM_ID"].presence || Rails.application.credentials.dig(:apple, :team_id)
    key_id = ENV["APPLE_KEY_ID"].presence || Rails.application.credentials.dig(:apple, :key_id)
    private_key = ENV["APPLE_PRIVATE_KEY"].presence || Rails.application.credentials.dig(:apple, :private_key)
    raise ExchangeError, "Apple login is not configured" if [ team, key_id, private_key ].any?(&:blank?)
    JWT.encode({ iss: team, iat: Time.current.to_i, exp: 5.minutes.from_now.to_i,
      aud: "https://appleid.apple.com", sub: ENV.fetch("APPLE_BUNDLE_ID", "day.shred.app") },
      OpenSSL::PKey::EC.new(private_key), "ES256", kid: key_id)
  rescue OpenSSL::PKey::PKeyError, OpenSSL::PKey::ECError, JWT::EncodeError
    raise ExchangeError, "Apple login is not configured correctly"
  end

  class Result
    attr_reader :refresh_token, :identity_token

    def initialize(refresh_token, identity_token = nil)
      @refresh_token, @identity_token = refresh_token, identity_token
    end

    def exchanged?
      true
    end
  end
end
