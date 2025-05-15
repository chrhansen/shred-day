class CreateJoinTableDaySki < ActiveRecord::Migration[8.0]
  def change
    remove_reference :days, :ski, foreign_key: true, null: false, type: :string

    create_join_table :days, :skis, column_options: {type: :string} do |t|
      t.index [:day_id, :ski_id]
      t.index [:ski_id, :day_id]
    end
  end
end
