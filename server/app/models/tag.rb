class Tag < ApplicationRecord
  belongs_to :user
  has_many :tag_days, dependent: :restrict_with_error
  has_many :days, through: :tag_days

  before_validation :normalize_name

  validates :name, presence: true, length: { maximum: 40 }
  validates :name, uniqueness: { scope: :user_id, case_sensitive: false }

  private

  def normalize_name
    self.name = name.to_s.strip
  end
end
