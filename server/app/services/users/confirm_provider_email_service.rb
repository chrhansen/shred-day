class Users::ConfirmProviderEmailService
  def initialize(user, claims)
    @user, @claims = user, claims
  end

  def confirm_email
    verified = [ true, "true" ].include?(@claims["email_verified"])
    email = @claims["email"].to_s.strip.downcase
    return unless verified && email.present? && email == @user.email.downcase

    @user.with_lock do
      recover_unconfirmed_password = @user.email_confirmed_at.nil? && @user.password_confirmed_at.nil?
      @user.email_confirmed_at ||= Time.current
      if recover_unconfirmed_password
        @user.password = SecureRandom.hex(32)
        @user.password_session_version += 1
        @user.email_confirmation_token_digest = nil
        @user.email_confirmation_expires_at = nil
        @user.email_confirmation_sent_at = nil
        @user.mobile_sessions.where(authentication_method: "password", revoked_at: nil).update_all(revoked_at: Time.current)
      end
      @user.save!
    end
  end
end
