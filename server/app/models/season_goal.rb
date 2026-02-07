class SeasonGoal < ApplicationRecord
  belongs_to :user

  validates :season_start_year, presence: true
  validates :goal_days,
            presence: true,
            numericality: { only_integer: true, greater_than: 0, less_than_or_equal_to: 366 }

  validates :season_start_year,
            numericality: { only_integer: true, greater_than_or_equal_to: 1900, less_than_or_equal_to: 3000 }
end

