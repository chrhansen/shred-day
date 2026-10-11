class Mobile::CreateSessionService
  def initialize(user, authentication_method: "password", provider_token_digest: nil)
    @user = user
    @authentication_method = authentication_method
    @provider_token_digest = provider_token_digest
  end

  def create_session
    token = SecureRandom.urlsafe_base64(32)
    record = @user.mobile_sessions.create!(
      token_digest: Digest::SHA256.hexdigest(token),
      expires_at: 30.days.from_now,
      authentication_method: @authentication_method,
      provider_token_digest: @provider_token_digest
    )
    Result.new(record, token)
  end

  class Result
    attr_reader :session, :token

    def initialize(session, token)
      @session = session
      @token = token
    end

    def created?
      @session.persisted?
    end
  end
end
