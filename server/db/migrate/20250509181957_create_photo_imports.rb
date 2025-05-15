class CreatePhotoImports < ActiveRecord::Migration[8.0]
  def change
    create_table :photo_imports, id: :string, default: -> { "gen_id('pi')" } do |t|
      t.references :user, null: false, foreign_key: true, type: :string
      t.integer :status, default: 0, null: false

      t.timestamps
    end
  end
end
