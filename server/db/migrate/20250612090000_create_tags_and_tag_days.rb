class CreateTagsAndTagDays < ActiveRecord::Migration[8.0]
  def change
    create_table :tags, id: :string, default: -> { "gen_id('tag')" } do |t|
      t.references :user, null: false, type: :string, foreign_key: true
      t.string :name, null: false

      t.timestamps
    end

    add_index :tags, [:user_id, :name], unique: true

    create_table :tag_days, id: :string, default: -> { "gen_id('tgdy')" } do |t|
      t.references :day, null: false, type: :string, foreign_key: { on_delete: :cascade }
      t.references :tag, null: false, type: :string, foreign_key: true

      t.timestamps
    end

    add_index :tag_days, [:day_id, :tag_id], unique: true
  end
end
