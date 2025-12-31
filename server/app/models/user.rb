class User < ApplicationRecord
  # Adds methods to set and authenticate against a BCrypt password.
  # This requires a `password_digest` attribute.
  has_secure_password

  # Associations
  has_many :days, dependent: :destroy
  has_many :skis, dependent: :destroy
  has_many :photos, dependent: :destroy
  has_many :photo_imports, dependent: :destroy
  has_many :text_imports, dependent: :destroy
  has_many :draft_days, through: :photo_imports
  has_many :draft_days, through: :text_imports
  has_many :tags, dependent: :destroy
  has_one :google_sheet_integration, dependent: :destroy
  has_one_attached :avatar

  has_many :recent_resorts, -> {
    select("resorts.*, MAX(days.date)")
      .group("resorts.id") # Group by primary key is usually sufficient
      .order("MAX(days.date) DESC")
    }, through: :days, source: :resort

  # Validations
  validates :email, presence: true, uniqueness: { case_sensitive: false }, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :password, length: { minimum: 8 }, if: -> { new_record? || !password.nil? }
  validates :username,
            length: { in: 3..20 },
            format: { with: /\A[a-zA-Z0-9_]+\z/ },
            uniqueness: { case_sensitive: false },
            allow_nil: true
  validates :season_start_day, presence: true
  validate :season_start_day_must_be_valid_date

  def season_start_day_must_be_valid_date
    return if season_start_day.blank?

    begin
      # Use a dummy leap-safe year like 2000 for parsing
      Date.strptime("2000-#{season_start_day}", "%Y-%m-%d")
    rescue ArgumentError
      errors.add(:season_start_day, "must be a valid date in MM-DD format (e.g., 09-15)")
    end
  end

end
