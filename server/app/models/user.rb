class User < ApplicationRecord
  # Adds methods to set and authenticate against a BCrypt password.
  # This requires a `password_digest` attribute.
  has_secure_password

  # Associations
  has_many :days, dependent: :destroy
  has_many :skis, dependent: :destroy
  has_many :photos, dependent: :destroy
  has_many :photo_imports, dependent: :destroy
  has_many :draft_days, through: :photo_imports

  has_many :recent_resorts, -> {
    select("resorts.*, MAX(days.date)")
      .group("resorts.id") # Group by primary key is usually sufficient
      .order("MAX(days.date) DESC")
    }, through: :days, source: :resort

  # Validations
  validates :email, presence: true, uniqueness: { case_sensitive: false }, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :password, length: { minimum: 8 }, if: -> { new_record? || !password.nil? }
end
