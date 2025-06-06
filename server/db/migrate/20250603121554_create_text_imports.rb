class CreateTextImports < ActiveRecord::Migration[8.0]
  def change
    create_table :text_imports, id: :string, default: -> { "gen_id('ti')" } do |t|
      t.references :user, null: false, foreign_key: true, type: :string
      t.integer :status, default: 0, null: false
      t.text :original_text, null: true

      t.timestamps
    end
  end
end
