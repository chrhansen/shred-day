class BindPasswordSessionVersions < ActiveRecord::Migration[8.0]
  def change
    add_column :mobile_sessions, :password_session_version, :integer
  end
end
