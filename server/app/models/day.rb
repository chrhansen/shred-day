class Day < ApplicationRecord
  belongs_to :user
  belongs_to :resort
  has_many :photos, dependent: :destroy
  has_many :draft_days, dependent: :destroy
  has_and_belongs_to_many :skis

  # Validations
  validates :date, :resort, :user, presence: true

  # Custom validation for max 3 entries per user per date
  validate :maximum_3days_per_date, on: [:create, :update]

  private

  def maximum_3days_per_date
    # Skip validation if user or date is missing (other validations will catch this)
    return unless user && date

    # Build the query for other records on the same date by the same user
    scope = user.days.where(date: date)

    # If the current record is already saved (an update), exclude it from the count
    scope = scope.where.not(id: id) if persisted?

    # Check if the count of *other* records is already at the limit (3)
    if scope.count >= 3
      # Add error to :base as it relates to the record combination, not just the date field
      errors.add(:base, "cannot log more than 3 entries for the same date")
    end
  end
end
