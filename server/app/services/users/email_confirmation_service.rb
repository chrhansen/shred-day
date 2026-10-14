class Users::EmailConfirmationService
  MESSAGE = "Check your email to confirm your address and set your password."
  INVALID_LINK = "This confirmation link is invalid or has expired. Request a new one."
  COOLDOWN = 1.minute
  LIFETIME = 24.hours

  def request_confirmation(email)
    users = User.where("LOWER(email) = ?", email.to_s.strip.downcase).limit(2).to_a
    send_confirmation(users.first) if users.one?
  end

  def send_confirmation(user)
    token = nil
    user.with_lock do
      return if user.password_confirmed_at.present?
      return if user.email_confirmation_sent_at && user.email_confirmation_sent_at > COOLDOWN.ago
      token = SecureRandom.urlsafe_base64(32)
      user.update!(email_confirmation_token_digest: Digest::SHA256.hexdigest(token),
        email_confirmation_expires_at: LIFETIME.from_now, email_confirmation_sent_at: Time.current)
    end
    envelope = self.class.encryptor.encrypt_and_sign({ "token" => token, "email" => user.email })
    Users::EmailConfirmationDeliveryJob.perform_later(user.id, envelope)
  end

  def confirm(token:, password:, password_confirmation:)
    return Result.new(false, error: INVALID_LINK) unless token.to_s.match?(/\A[A-Za-z0-9_-]{43}\z/)
    result = nil
    User.transaction do
      user = User.lock.find_by(email_confirmation_token_digest: Digest::SHA256.hexdigest(token))
      valid = user && user.password_confirmed_at.nil? && user.email_confirmation_expires_at&.future?
      return Result.new(false, error: INVALID_LINK) unless valid
      user.assign_attributes(password: password.to_s, password_confirmation: password_confirmation.to_s)
      unless password.present? && password_confirmation.present? && user.valid?
        errors = user.errors.full_messages
        errors << "Password and password confirmation are required" if password.blank? || password_confirmation.blank?
        return Result.new(false, errors: errors.uniq)
      end
      user.assign_attributes(email_confirmed_at: Time.current, password_confirmed_at: Time.current,
        password_session_version: user.password_session_version + 1,
        email_confirmation_token_digest: nil, email_confirmation_expires_at: nil)
      user.save!
      user.mobile_sessions.where(authentication_method: "password", revoked_at: nil).update_all(revoked_at: Time.current)
      result = Result.new(true)
    end
    result
  end

  def self.encryptor
    key = Rails.application.key_generator.generate_key("password-email-confirmation-delivery", 32)
    ActiveSupport::MessageEncryptor.new(key, serializer: JSON)
  end

  class Result
    attr_reader :error, :errors

    def initialize(confirmed, error: nil, errors: nil)
      @confirmed, @error, @errors = confirmed, error, errors
    end

    def confirmed?
      @confirmed
    end
  end
end
