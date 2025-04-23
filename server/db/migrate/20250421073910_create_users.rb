class CreateUsers < ActiveRecord::Migration[8.0]
  def change
    create_table :users, id: :string, default: -> { "gen_id('user')" } do |t|
      t.string :email
      t.string :password_digest

      t.timestamps
    end
    add_index :users, :email
  end
end
