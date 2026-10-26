class AddOfflineSyncReceipts < ActiveRecord::Migration[8.0]
  def change
    create_table :mobile_sync_receipts, id: :string, default: -> { "gen_id('syn')" } do |t|
      t.references :user, null: false, type: :string, foreign_key: true
      t.string :operation_id, null: false
      t.string :request_digest, null: false
      t.jsonb :response_body, null: false
      t.integer :response_status, null: false
      t.timestamps
    end
    add_index :mobile_sync_receipts, [ :user_id, :operation_id ], unique: true
    add_column :photos, :upload_id, :string
    add_index :photos, [ :user_id, :upload_id ], unique: true, where: "upload_id IS NOT NULL"
  end
end
