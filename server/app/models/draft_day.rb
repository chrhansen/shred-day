class DraftDay < ApplicationRecord
  belongs_to :photo_import, optional: true
  belongs_to :text_import, optional: true
  belongs_to :resort
  has_many :photos
  belongs_to :day, optional: true

  enum :decision, { pending: 0, merge: 1, duplicate: 2, skip: 3 }, prefix: true

  validates_presence_of :day, if: :decision_merge?

  validates :date, presence: true

  # Ensure exactly one import type is associated
  validate :single_import_type

  private

  def single_import_type
    if photo_import_id.present? && text_import_id.present?
      errors.add(:base, "Cannot belong to both photo_import and text_import")
    elsif photo_import_id.blank? && text_import_id.blank?
      errors.add(:base, "Must belong to either photo_import or text_import")
    end
  end
end
