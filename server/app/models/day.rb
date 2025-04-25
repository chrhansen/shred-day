class Day < ApplicationRecord
  belongs_to :user
  belongs_to :ski
  belongs_to :resort

  # Validations
  validates :date, :resort, :ski, :user, presence: true
end
