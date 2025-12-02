### Exchanges an OAuth code for tokens and validates state; returns access/refresh tokens.
module GoogleSheets
  class TokenExchangeService
    def initialize(session:, code:, state:)
      @session = session
      @code = code
      @state = state
    end

    def exchange_tokens
      stored_state = @session.delete(:google_sheets_oauth_state)
      return Result.new(error: "Invalid state") if stored_state.nil? || stored_state != @state

      token = oauth_client.auth_code.get_token(
        @code,
        redirect_uri: GoogleSheets::Config.redirect_uri,
        scope: GoogleSheets::SCOPES.join(" ")
      )

      if token.token.blank?
        return Result.new(error: "Access token missing from Google response")
      end

      expiry_time = token.expires_at ? Time.at(token.expires_at) : 1.hour.from_now

      Result.new(
        access_token: token.token,
        refresh_token: token.refresh_token,
        expires_at: expiry_time
      )
    rescue OAuth2::Error => e
      Result.new(error: e.message)
    rescue StandardError => e
      Result.new(error: e.message)
    end

    private

    def oauth_client
      @oauth_client ||= OAuth2::Client.new(
        GoogleSheets::Config.client_id,
        GoogleSheets::Config.client_secret,
        site: "https://accounts.google.com",
        authorize_url: "/o/oauth2/v2/auth",
        token_url: "https://oauth2.googleapis.com/token"
      )
    end

    class Result
      attr_reader :access_token, :refresh_token, :expires_at, :error

      def initialize(access_token: nil, refresh_token: nil, expires_at: nil, error: nil)
        @access_token = access_token
        @refresh_token = refresh_token
        @expires_at = expires_at
        @error = error
      end

      def exchanged?
        error.nil?
      end
    end
  end
end
