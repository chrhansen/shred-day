class AddDayRefToPhotos < ActiveRecord::Migration[8.0]
  def change
    add_reference :photos, :day, null: true, foreign_key: true, type: :string
  end
end
