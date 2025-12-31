class AddSharedAtToDays < ActiveRecord::Migration[8.0]
  def change
    add_column :days, :shared_at, :datetime
  end
end
