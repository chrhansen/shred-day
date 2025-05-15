class Ski < ApplicationRecord
  belongs_to :user
  has_and_belongs_to_many :days

  # Validations
  validates :name, :user, presence: true
end
