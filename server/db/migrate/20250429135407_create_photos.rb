class CreatePhotos < ActiveRecord::Migration[8.0]
  def change
    create_table :photos, id: :string, default: -> { "gen_id('ph')" } do |t|
      t.timestamps
    end
  end
end
