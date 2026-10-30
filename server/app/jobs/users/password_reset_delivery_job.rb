class Users::PasswordResetDeliveryJob < ApplicationJob
  class DeliveryError < StandardError; end

  self.log_arguments = false
  self.enqueue_after_transaction_commit = true
  retry_on DeliveryError, wait: :polynomially_longer, attempts: 5

  def perform(user_id, envelope)
    user = User.find_by(id: user_id)
    return unless user

    payload = Users::PasswordResetService.encryptor.decrypt_and_verify(envelope)
    valid = user.email == payload.fetch("email") && user.password_reset_expires_at&.future? &&
      user.password_reset_session_version == user.password_session_version &&
      user.password_reset_token_digest.present? &&
      ActiveSupport::SecurityUtils.secure_compare(user.password_reset_token_digest,
        Digest::SHA256.hexdigest(payload.fetch("token")))
    return unless valid

    PasswordResetMailer.with(user: user, reset_token: payload.fetch("token")).reset.deliver_now
  rescue ActiveSupport::MessageEncryptor::InvalidMessage, KeyError
    nil
  rescue StandardError
    raise DeliveryError, "Password reset email delivery failed", cause: nil
  end
end
