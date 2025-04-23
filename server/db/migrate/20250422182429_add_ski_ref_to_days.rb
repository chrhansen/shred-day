class AddSkiRefToDays < ActiveRecord::Migration[8.0]
  def change
    # Add the foreign key reference, making it non-nullable
    add_reference :days, :ski, foreign_key: true, null: false

    # Remove the old string column
    remove_column :days, :ski, :string
  end
end
