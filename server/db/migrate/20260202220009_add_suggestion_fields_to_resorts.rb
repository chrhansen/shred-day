class AddSuggestionFieldsToResorts < ActiveRecord::Migration[8.0]
  def change
    add_column :resorts, :suggested_at, :datetime
    add_column :resorts, :suggested_by, :string
    add_column :resorts, :verified, :boolean, default: true, null: false

    add_index :resorts, :suggested_by
    add_foreign_key :resorts, :users, column: :suggested_by
  end
end
