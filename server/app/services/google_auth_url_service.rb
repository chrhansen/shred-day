class GoogleAuthUrlService
  def initialize(session:)
    @session = session
  end

  def auth_url
    state = SecureRandom.hex(24)
    @session[:oauth_state] = state

    # Build auth URL
    auth_url = if google_client_id.present? && google_client_secret.present?
      client.auth_code.authorize_url(
        scope: 'openid email profile',
        access_type: 'offline',
        prompt: 'consent',
        state: state
      )
    else
      fallback_auth_url(state)
    end

    Result.new(auth_url: auth_url)
  end


  private

  def google_client_id
    ENV["GOOGLE_CLIENT_ID"] || Rails.application.credentials.dig(:google, :client_id)
  end

  def google_client_secret
    ENV["GOOGLE_CLIENT_SECRET"] || Rails.application.credentials.dig(:google, :client_secret)
  end

  def fallback_auth_url(state)
    uri = URI("https://accounts.google.com/o/oauth2/v2/auth")
    uri.query = {
      client_id: google_client_id.presence || "dummy-client-id",
      redirect_uri: redirect_uri,
      response_type: "code",
      scope: "openid email profile",
      access_type: "offline",
      prompt: "consent",
      state: state
    }.to_query
    uri.to_s
  end

  class Result
    attr_accessor :auth_url, :error

    def initialize(auth_url:)
      @auth_url = auth_url
    end
  end

  def client
    @client ||= OAuth2::Client.new(
      google_client_id,
      google_client_secret,
      site: 'https://oauth2.googleapis.com',
      authorize_url: 'https://accounts.google.com/o/oauth2/v2/auth',
      token_url: '/token',
      redirect_uri: redirect_uri
    )
  end

  def redirect_uri
    if Rails.env.production?
      "https://#{Rails.application.default_url_options[:host]}/auth/callback"
    else
      "http://#{Rails.application.default_url_options[:host]}:8080/auth/callback"
    end
  end
end
