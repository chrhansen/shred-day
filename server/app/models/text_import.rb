class TextImport < ApplicationRecord
  belongs_to :user

  enum :status, {
    waiting: 0,
    processing: 1,
    committed: 2,
    canceled: 3,
    failed: 4
  }, prefix: true

  has_many :draft_days, -> { order(created_at: :desc) }, dependent: :delete_all
end
