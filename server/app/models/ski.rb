class Ski < ApplicationRecord
  belongs_to :user

  # Validations
  validates :name, :user, presence: true
end
