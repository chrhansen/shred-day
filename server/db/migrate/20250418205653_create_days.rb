class CreateDays < ActiveRecord::Migration[8.0]
  def change
    create_table :days, id: :string, default: -> { "gen_id('day')" } do |t|
      t.date :date
      t.string :resort
      t.string :ski
      t.string :activity

      t.timestamps
    end
  end
end
