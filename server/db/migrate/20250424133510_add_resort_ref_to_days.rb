class AddResortRefToDays < ActiveRecord::Migration[8.0]
  def change
    add_reference :days, :resort, null: false, foreign_key: true, type: :string
  end
end
