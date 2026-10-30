class AddPasswordResets < ActiveRecord::Migration[8.0]
  def change
    add_column :users, :password_reset_token_digest, :string
    add_column :users, :password_reset_expires_at, :datetime
    add_column :users, :password_reset_sent_at, :datetime
    add_column :users, :password_reset_session_version, :integer
    add_index :users, :password_reset_token_digest, unique: true
  end
end
