class AddSeasonStartDay < ActiveRecord::Migration[8.0]
  def change
    add_column :users, :season_start_day, :string, default: "09-01", null: false
  end
end
