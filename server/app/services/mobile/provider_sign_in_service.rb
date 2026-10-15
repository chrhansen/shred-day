class Mobile::ProviderSignInService
  class LinkingError < StandardError; end

  def initialize(provider:, identity_token:, authorization_code: nil, challenge_id: nil, session: nil)
    @provider, @identity_token, @authorization_code, @challenge_id, @session =
      provider, identity_token, authorization_code, challenge_id, session
    @user = session&.user
  end

  def sign_in
    claims = Mobile::ProviderVerificationService.new(provider: @provider, identity_token: @identity_token).verify_identity.claims
    result = nil
    AuthIdentity.transaction do
      verify_apple_nonce!(claims) if @provider == "apple"
      digest = Digest::SHA256.hexdigest(@identity_token)
      raise LinkingError, "Please sign in again" if MobileSession.exists?(provider_token_digest: digest)
      identity = AuthIdentity.find_by(provider: @provider, subject: claims["sub"])
      if identity && @user && identity.user_id != @user.id
        raise LinkingError, "This login is linked to another account"
      end
      user = identity&.user || @user || find_or_create_user(claims)
      user.with_lock do
        linking = identity.nil? && @user.present?
        if linking && !recently_authenticated?
          raise LinkingError, "Sign in to your existing account again before linking this login."
        end
        identity ||= user.auth_identities.build(provider: @provider, subject: claims["sub"])
        unless identity.ownership_verified? || verified_primary_email?(user, claims) || authorized_connection?
          raise LinkingError, "This sign-in method needs ownership verification. Sign in using your confirmed account email."
        end
        if @provider == "apple"
          exchanged = Mobile::AppleTokenService.new.exchange_code(@authorization_code)
          code_claims = Mobile::ProviderVerificationService.new(provider: "apple", identity_token: exchanged.identity_token).verify_identity.claims
          raise LinkingError, "Apple authorization does not match this login" unless code_claims["sub"] == claims["sub"]
          identity.refresh_token = exchanged.refresh_token
        end
        Users::ConfirmProviderEmailService.new(user, claims).confirm_email
        identity.ownership_verified_at ||= Time.current
        identity.save!
        method = linking ? "linked_#{@provider}" : @provider
        result = Mobile::CreateSessionService.new(user, authentication_method: method, provider_token_digest: digest,
          auth_identity: identity).create_session
      end
    end
    Result.new(result)
  rescue LinkingError, Mobile::ProviderVerificationService::VerificationError, Mobile::AppleTokenService::ExchangeError => e
    Result.new(nil, e.message)
  rescue ActiveRecord::RecordInvalid, ActiveRecord::RecordNotUnique
    Result.new(nil, "Could not sign in. Please try again or sign in to your existing account first.")
  end

  private

  def recently_authenticated?
    @session&.reload
    return false unless @session && @session.revoked_at.nil? && @session.expires_at > Time.current &&
      @session.created_at >= 5.minutes.ago && %w[password google apple].include?(@session.authentication_method)
    authentication_user = @session.user.reload
    if @session.authentication_method == "password"
      return authentication_user.password_confirmed? &&
        @session.password_session_version == authentication_user.password_session_version
    end
    @session.auth_identity&.ownership_verified? && @session.auth_identity.user_id == @session.user_id &&
      @session.auth_identity.provider == @session.authentication_method
  end

  def verified_primary_email?(user, claims)
    [ true, "true" ].include?(claims["email_verified"]) && claims["email"].present? &&
      claims["email"].strip.downcase == user.email.downcase
  end

  def authorized_connection?
    recently_authenticated? && @session.user.email_confirmed_at.present?
  end

  def find_or_create_user(claims)
    email = claims["email"].to_s.strip.downcase
    verified = [ true, "true" ].include?(claims["email_verified"])
    raise LinkingError, "A verified email is required to sign in" if email.blank? || !verified
    matching_users = User.where("LOWER(email) = ?", email).limit(2).to_a
    raise LinkingError, "Multiple accounts use this email. Please contact support." if matching_users.many?
    return matching_users.first if matching_users.any?
    result = Users::CreateUserService.new({ email: email }, password_signup: false).create_user
    raise LinkingError, "Could not create your account" unless result.created?
    result.user
  end

  def verify_apple_nonce!(claims)
    challenge = MobileAuthChallenge.lock.find_by(id: @challenge_id)
    nonce = claims["nonce"].to_s
    valid = challenge&.available? && nonce.present? &&
      ActiveSupport::SecurityUtils.secure_compare(challenge.nonce_digest, Digest::SHA256.hexdigest(nonce))
    raise LinkingError, "Apple sign-in expired. Please try again." unless valid
    challenge.update!(consumed_at: Time.current)
  end

  class Result
    attr_reader :session_result, :error

    def initialize(session_result, error = nil)
      @session_result, @error = session_result, error
    end

    def signed_in?
      @session_result.present?
    end
  end
end
