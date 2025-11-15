class TagDay < ApplicationRecord
  belongs_to :tag
  belongs_to :day

  validates :tag_id, uniqueness: { scope: :day_id }
end
