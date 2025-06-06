class AddOriginalTextToDraftDays < ActiveRecord::Migration[8.0]
  def change
    add_column :draft_days, :original_text, :text
  end
end
