class Day < ApplicationRecord
  belongs_to :user
  belongs_to :ski
  belongs_to :resort

  # Validations (example)
  # validates :date, presence: true
  # validates :resort, presence: true
end
