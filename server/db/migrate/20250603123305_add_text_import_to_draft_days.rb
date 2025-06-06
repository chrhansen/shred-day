class AddTextImportToDraftDays < ActiveRecord::Migration[8.0]
  def change
    add_reference :draft_days, :text_import, null: true, foreign_key: true, type: :string

    change_column_null :draft_days, :photo_import_id, true

    # Add check constraint to ensure exactly one import type is set
    add_check_constraint :draft_days,
      "(photo_import_id IS NOT NULL AND text_import_id IS NULL) OR (photo_import_id IS NULL AND text_import_id IS NOT NULL)",
      name: "single_import_type"
  end
end
