class CreateSeasonGoals < ActiveRecord::Migration[8.0]
  def change
    create_table :season_goals, id: :string, default: -> { "gen_id('sgo')" } do |t|
      t.string :user_id, null: false
      t.integer :season_start_year, null: false
      t.integer :goal_days, null: false

      t.timestamps
    end

    add_index :season_goals, [:user_id, :season_start_year], unique: true
    add_index :season_goals, :user_id
  end
end

