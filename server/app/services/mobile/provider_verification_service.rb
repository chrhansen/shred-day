require "jwt"
require "net/http"

class Mobile::ProviderVerificationService
  class VerificationError < StandardError; end

  def initialize(provider:, identity_token:)
    @provider = provider
    @identity_token = identity_token
  end

  def verify_identity
    raise VerificationError, "Provider identity token required" unless @identity_token.is_a?(String) && @identity_token.present?
    payload = case @provider
    when "google"
      audience = ENV["GOOGLE_WEB_CLIENT_ID"].presence || Rails.application.credentials.dig(:google, :client_id)
      raise VerificationError, "Google login is not configured" if audience.blank?
      Google::Auth::IDTokens.verify_oidc(@identity_token, aud: audience)
    when "apple"
      JWT.decode(@identity_token, nil, true,
        algorithms: [ "RS256" ], jwks: apple_keys, verify_iss: true, iss: "https://appleid.apple.com",
        verify_aud: true, aud: ENV.fetch("APPLE_BUNDLE_ID", "day.shred"), required_claims: %w[sub exp iat iss aud])[0]
    else
      raise VerificationError, "Unsupported login provider"
    end
    raise VerificationError, "Missing provider identity" if payload["sub"].blank?
    raise VerificationError, "Please sign in again" unless payload["iat"].to_i.between?(10.minutes.ago.to_i, 30.seconds.from_now.to_i)
    Result.new(payload)
  rescue Google::Auth::IDTokens::VerificationError, JWT::DecodeError, JSON::ParserError, KeyError, TypeError, ArgumentError
    raise VerificationError, "Could not verify provider identity"
  end

  private

  def apple_keys
    Rails.cache.fetch("mobile-apple-sign-in-jwks", expires_in: 1.hour) do
      uri = URI("https://appleid.apple.com/auth/keys")
      response = Net::HTTP.start(uri.host, uri.port, use_ssl: true, open_timeout: 5, read_timeout: 5) { |http| http.get(uri.request_uri) }
      raise VerificationError, "Apple login is temporarily unavailable" unless response.is_a?(Net::HTTPSuccess)
      JSON.parse(response.body)
    end
  rescue IOError, SystemCallError, Timeout::Error
    raise VerificationError, "Apple login is temporarily unavailable"
  end

  class Result
    attr_reader :claims

    def initialize(claims)
      @claims = claims
    end

    def verified?
      @claims.present?
    end
  end
end
