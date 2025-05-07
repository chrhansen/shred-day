class AddNotesToDay < ActiveRecord::Migration[8.0]
  def change
    add_column :days, :notes, :text
  end
end
