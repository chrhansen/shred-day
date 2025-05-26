class AddDayNumberToDays < ActiveRecord::Migration[8.0]
  def change
    add_column :days, :day_number, :integer
  end
end
