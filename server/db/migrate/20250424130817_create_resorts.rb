class CreateResorts < ActiveRecord::Migration[8.0]
  def change
    create_table :resorts, id: :string, default: -> { "gen_id('re')" } do |t|
      t.string :name
      t.float :latitude
      t.float :longitude
      t.string :country
      t.string :region

      t.timestamps
    end
  end
end
