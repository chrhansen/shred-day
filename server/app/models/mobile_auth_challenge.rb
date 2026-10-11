class MobileAuthChallenge < ApplicationRecord
  validates :nonce_digest, :expires_at, presence: true

  def available?
    consumed_at.nil? && expires_at > Time.current
  end
end
