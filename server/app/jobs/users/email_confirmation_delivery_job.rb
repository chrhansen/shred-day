class Users::EmailConfirmationDeliveryJob < ApplicationJob
  class DeliveryError < StandardError; end

  self.log_arguments = false
  self.enqueue_after_transaction_commit = true
  retry_on DeliveryError, wait: :polynomially_longer, attempts: 5

  def perform(user_id, envelope)
    user = User.find_by(id: user_id)
    return unless user
    payload = Users::EmailConfirmationService.encryptor.decrypt_and_verify(envelope)
    valid = user.password_confirmed_at.nil? && user.email == payload.fetch("email") &&
      user.email_confirmation_expires_at&.future? && user.email_confirmation_token_digest.present? &&
      ActiveSupport::SecurityUtils.secure_compare(user.email_confirmation_token_digest,
        Digest::SHA256.hexdigest(payload.fetch("token")))
    return unless valid
    EmailConfirmationMailer.with(user: user, confirmation_token: payload.fetch("token")).confirmation.deliver_now
  rescue ActiveSupport::MessageEncryptor::InvalidMessage, KeyError
    nil
  rescue StandardError
    raise DeliveryError, "Confirmation email delivery failed", cause: nil
  end
end
