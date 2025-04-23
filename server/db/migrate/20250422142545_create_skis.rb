class CreateSkis < ActiveRecord::Migration[8.0]
  def change
    create_table :skis, id: :string, default: -> { "gen_id('ski')" } do |t|
      t.string :name
      t.references :user, null: false, foreign_key: true, type: :string

      t.timestamps
    end
  end
end
