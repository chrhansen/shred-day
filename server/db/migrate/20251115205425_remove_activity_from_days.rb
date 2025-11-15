class RemoveActivityFromDays < ActiveRecord::Migration[8.0]
  def change
    remove_column :days, :activity, :string
  end
end
