class Ski < ApplicationRecord
  belongs_to :user
  has_many :days, dependent: :restrict_with_error

  # Validations
  validates :name, :user, presence: true
end
