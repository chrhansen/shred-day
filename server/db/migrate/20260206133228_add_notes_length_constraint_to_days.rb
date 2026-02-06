class AddNotesLengthConstraintToDays < ActiveRecord::Migration[8.0]
  CONSTRAINT_NAME = "days_notes_max_500_chars"

  def up
    execute <<~SQL
      UPDATE days
      SET notes = LEFT(notes, 500)
      WHERE notes IS NOT NULL
        AND char_length(notes) > 500
    SQL

    add_check_constraint :days, "notes IS NULL OR char_length(notes) <= 500", name: CONSTRAINT_NAME
  end

  def down
    remove_check_constraint :days, name: CONSTRAINT_NAME
  end
end
