class DraftDay < ApplicationRecord
  belongs_to :photo_import
  belongs_to :resort
  has_many :photos
  belongs_to :day, optional: true

  enum :decision, { pending: 0, merge: 1, duplicate: 2, skip: 3 }, prefix: true

  validates_presence_of :day, if: :decision_merge?

  validates :date, presence: true
end
