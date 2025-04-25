class Resort < ApplicationRecord
  has_many :days

  # Validations
  validates :name, presence: true, uniqueness: { scope: :country }
  validates :country, presence: true
end
