class AddDayRefToPhotos < ActiveRecord::Migration[8.0]
  def change
    add_reference :photos, :day, null: false, foreign_key: true, type: :string
  end
end
