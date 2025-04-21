class Day < ApplicationRecord
  belongs_to :user

  # Validations (example)
  # validates :date, presence: true
  # validates :resort, presence: true
end
