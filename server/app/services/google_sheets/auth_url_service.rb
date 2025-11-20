module GoogleSheets
  class AuthUrlService
    def initialize(session:)
      @session = session
    end

    def auth_url
      state = SecureRandom.hex(24)
      @session[:google_sheets_oauth_state] = state

      url = oauth_client.auth_code.authorize_url(
        scope: GoogleSheets::SCOPES.join(" "),
        access_type: "offline",
        prompt: "consent",
        redirect_uri: GoogleSheets::Config.redirect_uri,
        state: state
      )

      Result.new(auth_url: url)
    rescue StandardError => e
      Result.new(auth_url: nil, error: e.message)
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
      attr_reader :auth_url, :error

      def initialize(auth_url:, error: nil)
        @auth_url = auth_url
        @error = error
      end

      def generated?
        auth_url.present?
      end
    end
  end
end
