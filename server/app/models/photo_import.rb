class PhotoImport < ApplicationRecord
  belongs_to :user

  enum :status, {
    waiting: 0,
    processing: 1,
    committed: 2,
    canceled: 3,
    failed: 4
  }, prefix: true

  has_many :photos, dependent: :delete_all
  has_many :draft_days, dependent: :delete_all
end
