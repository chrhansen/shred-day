class RequirePasswordEmailConfirmation < ActiveRecord::Migration[8.0]
  def change
    add_column :users, :email_confirmed_at, :datetime
    add_column :users, :password_confirmed_at, :datetime
    add_column :users, :password_session_version, :integer, default: 0, null: false
    add_column :users, :email_confirmation_token_digest, :string
    add_column :users, :email_confirmation_expires_at, :datetime
    add_column :users, :email_confirmation_sent_at, :datetime
    add_index :users, :email_confirmation_token_digest, unique: true
  end
end
