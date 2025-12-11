class GoogleAuthUrlService
  def initialize(session:)
    @session = session
  end

  def auth_url
    state = SecureRandom.hex(24)
    @session[:oauth_state] = state

    # Build auth URL
    auth_url = client.auth_code.authorize_url(
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent',
      state: state
    )

    Result.new(auth_url: auth_url)
  end


  private

  class Result
    attr_accessor :auth_url, :error

    def initialize(auth_url:)
      @auth_url = auth_url
    end
  end

  def client
    @client ||= OAuth2::Client.new(
      Rails.application.credentials.dig(:google, :client_id),
      Rails.application.credentials.dig(:google, :client_secret),
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
