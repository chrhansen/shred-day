class CreateDraftDays < ActiveRecord::Migration[8.0]
  def change
    create_table :draft_days, id: :string, default: -> { "gen_id('drd')" } do |t|
      t.references :photo_import, null: false, foreign_key: true, type: :string
      t.references :resort, null: false, foreign_key: true, type: :string
      t.references :day, null: true, foreign_key: true, type: :string
      t.date :date, null: false
      t.integer :decision, null: false, default: 0

      t.timestamps
    end
  end
end
