class GoogleCodeToUserService
  def initialize(session:, code: nil, state: nil)
    @session = session
    @code = code
    @state = state
  end

  def to_local_user
    oauth_state = @session.delete(:oauth_state)

    if @state != oauth_state
      return Result.new(error: 'Invalid state')
    end

    token = client.auth_code.get_token(@code)
    id_token = token.params['id_token']

    if id_token.blank?
      return Result.new(error: 'ID token not found in Google response')
    end

    payload = Google::Auth::IDTokens.verify_oidc(
      id_token,
      aud: Rails.application.credentials.dig(:google, :client_id))

    user = User.find_or_initialize_by(email: payload['email'].downcase)
    if user.new_record?
      user.password = SecureRandom.hex(12)
      user.save
    end

    if user.present?
      user.update(full_name: payload['name']) if payload['name']
      @session[:user_id] = user.id
      Result.new(user: user, session: @session)
    else
      Result.new(error: 'User not found')
    end
  end

  private

  class Result
    attr_accessor :user, :session, :error

    def initialize(user: nil, session: nil, error: nil)
      @user = user
      @session = session
      @error = error
    end

    def signed_in?
      @user.present?
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
