class CreateGoogleSheetIntegrations < ActiveRecord::Migration[8.0]
  def change
    create_table :google_sheet_integrations, id: false do |t|
      t.string :id, primary_key: true, default: -> { "gen_id('gsi')" }
      t.string :user_id, null: false
      t.string :spreadsheet_id
      t.string :spreadsheet_url
      t.text :access_token
      t.text :refresh_token
      t.datetime :access_token_expires_at
      t.integer :status, null: false, default: 0
      t.datetime :last_synced_at
      t.text :last_error

      t.timestamps
    end

    add_index :google_sheet_integrations, :user_id, unique: true
    add_foreign_key :google_sheet_integrations, :users
  end
end
