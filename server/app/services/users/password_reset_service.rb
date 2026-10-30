class Users::PasswordResetService
  REQUEST_MESSAGE = "If an account exists for this email address, we’ll send a password reset link."
  INVALID_LINK = "This password reset link is invalid or has expired. Request a new one."
  COOLDOWN = 1.minute
  LIFETIME = 1.hour

  def request_reset(email)
    return unless email.is_a?(String)

    users = User.where("LOWER(email) = ?", email.to_s.strip.downcase).limit(2).to_a
    return unless users.one?

    user = users.first
    user.with_lock do
      return if user.password_reset_sent_at && user.password_reset_sent_at > COOLDOWN.ago

      token = SecureRandom.urlsafe_base64(32)
      user.update!(password_reset_token_digest: Digest::SHA256.hexdigest(token),
        password_reset_expires_at: LIFETIME.from_now, password_reset_sent_at: Time.current,
        password_reset_session_version: user.password_session_version)
      envelope = self.class.encryptor.encrypt_and_sign({ "token" => token, "email" => user.email })
      Users::PasswordResetDeliveryJob.perform_later(user.id, envelope)
    end
  end

  def reset_password(token:, password:, password_confirmation:)
    return Result.new(false, error: INVALID_LINK) unless token.is_a?(String) && token.match?(/\A[A-Za-z0-9_-]{43}\z/)

    User.transaction do
      user = User.lock.find_by(password_reset_token_digest: Digest::SHA256.hexdigest(token))
      valid = user && user.password_reset_expires_at&.future? &&
        user.password_reset_session_version == user.password_session_version
      return Result.new(false, error: INVALID_LINK) unless valid

      unless password.is_a?(String) && password_confirmation.is_a?(String)
        return Result.new(false, errors: [ "Password and password confirmation are required" ])
      end

      user.assign_attributes(password: password, password_confirmation: password_confirmation)
      unless password.present? && password_confirmation.present? && user.valid?
        errors = user.errors.full_messages
        errors << "Password and password confirmation are required" if password.blank? || password_confirmation.blank?
        return Result.new(false, errors: errors.uniq)
      end

      user.update!(email_confirmed_at: Time.current, password_confirmed_at: Time.current,
        password_session_version: user.password_session_version + 1,
        email_confirmation_token_digest: nil, email_confirmation_expires_at: nil,
        password_reset_token_digest: nil, password_reset_expires_at: nil, password_reset_session_version: nil)
      user.mobile_sessions.where(authentication_method: "password", revoked_at: nil).update_all(revoked_at: Time.current)
      Result.new(true)
    end
  end

  def self.encryptor
    key = Rails.application.key_generator.generate_key("password-reset-delivery", 32)
    ActiveSupport::MessageEncryptor.new(key, serializer: JSON)
  end

  class Result
    attr_reader :error, :errors

    def initialize(reset, error: nil, errors: nil)
      @reset, @error, @errors = reset, error, errors
    end

    def reset?
      @reset
    end
  end
end
