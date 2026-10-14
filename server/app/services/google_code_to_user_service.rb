class GoogleCodeToUserService
  def initialize(session:, code: nil, state: nil)
    @session = session
    @code = code
    @state = state
  end

  def to_local_user
    oauth_state = @session.delete(:oauth_state)

    if oauth_state.blank? || @state.blank? || @state != oauth_state
      return Result.new(error: "Invalid state")
    end

    token = client.auth_code.get_token(@code)
    id_token = token.params["id_token"]

    if id_token.blank?
      return Result.new(error: "ID token not found in Google response")
    end

    payload = Google::Auth::IDTokens.verify_oidc(
      id_token,
      aud: Rails.application.credentials.dig(:google, :client_id))

    return Result.new(error: "A verified email is required to sign in") if payload["sub"].blank?

    user = nil
    identity = nil
    AuthIdentity.transaction do
      identity = AuthIdentity.find_by(provider: "google", subject: payload["sub"])
      verified_email = [ true, "true" ].include?(payload["email_verified"]) && payload["email"].present?
      unless identity&.ownership_verified? || verified_email
        return Result.new(error: "A verified email is required to sign in")
      end
      if identity && !identity.ownership_verified? && identity.user.email.downcase != payload["email"].strip.downcase
        return Result.new(error: "This sign-in method needs ownership verification. Sign in using your confirmed account email.")
      end
      matching = User.where("LOWER(email) = ?", payload["email"].strip.downcase).limit(2).to_a unless identity
      return Result.new(error: "Multiple accounts use this email. Please contact support.") if matching&.many?
      user = identity&.user || matching&.first
      unless user
        created = Users::CreateUserService.new({ email: payload["email"] }, password_signup: false).create_user
        return Result.new(error: "User not found") unless created.created?
        user = created.user
      end
      user.update!(full_name: payload["name"]) if payload["name"]
      Users::ConfirmProviderEmailService.new(user, payload).confirm_email
      identity ||= user.auth_identities.build(provider: "google", subject: payload["sub"])
      identity.ownership_verified_at ||= Time.current
      identity.save!
    end
    @session[:user_id] = user.id
    @session[:authentication_method] = "google"
    @session[:auth_identity_id] = identity.id
    @session.delete(:password_session_version)
    Result.new(user: user, session: @session)
  rescue ActiveRecord::RecordInvalid, ActiveRecord::RecordNotUnique
    Result.new(error: "Could not sign in. Please try again.")
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
      site: "https://oauth2.googleapis.com",
      authorize_url: "https://accounts.google.com/o/oauth2/v2/auth",
      token_url: "/token",
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
