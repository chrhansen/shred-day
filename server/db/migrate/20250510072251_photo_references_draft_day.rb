class PhotoReferencesDraftDay < ActiveRecord::Migration[8.0]
  def change
    add_reference :photos, :draft_day, null: true, foreign_key: true, type: :string
    add_reference :photos, :photo_import, null: true, foreign_key: true, type: :string
    add_reference :photos, :resort, null: true, foreign_key: true, type: :string

    add_column :photos, :latitude, :float
    add_column :photos, :longitude, :float
    add_column :photos, :taken_at, :datetime
    add_column :photos, :exif_state, :integer, default: 0, null: false
  end
end
