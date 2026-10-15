class MobileSession < ApplicationRecord
  belongs_to :user
  belongs_to :auth_identity, optional: true
  validates :token_digest, :expires_at, :authentication_method, presence: true
  scope :active, -> { where(revoked_at: nil).where("expires_at > ?", Time.current) }

  def self.find_by_token(token)
    return if token.blank?
    active.find_by(token_digest: Digest::SHA256.hexdigest(token))
  end
end
