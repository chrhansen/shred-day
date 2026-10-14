class AuthIdentity < ApplicationRecord
  belongs_to :user
  has_many :mobile_sessions, dependent: :nullify
  validates :provider, inclusion: { in: %w[google apple] }
  validates :subject, presence: true, uniqueness: { scope: :provider }

  def ownership_verified?
    ownership_verified_at.present?
  end

  def refresh_token
    token_encryptor.decrypt_and_verify(encrypted_refresh_token) if encrypted_refresh_token.present?
  end

  def refresh_token=(value)
    self.encrypted_refresh_token = value.present? ? token_encryptor.encrypt_and_sign(value) : nil
  end

  private

  def token_encryptor
    key = Rails.application.key_generator.generate_key("mobile-provider-tokens", 32)
    ActiveSupport::MessageEncryptor.new(key)
  end
end
