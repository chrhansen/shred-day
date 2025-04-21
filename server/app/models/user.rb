class User < ApplicationRecord
  # Adds methods to set and authenticate against a BCrypt password.
  # This requires a `password_digest` attribute.
  has_secure_password

  # Validations
  validates :email, presence: true, uniqueness: true, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :password, length: { minimum: 8 }, if: -> { new_record? || !password.nil? }
end
