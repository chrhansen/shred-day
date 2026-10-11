class CreateMobileAuthentication < ActiveRecord::Migration[8.0]
  def change
    create_table :mobile_sessions, id: :string, default: -> { "gen_id('ms')" } do |t|
      t.references :user, type: :string, null: false, foreign_key: true
      t.string :token_digest, null: false
      t.string :authentication_method, null: false, default: 'password'
      t.string :provider_token_digest
      t.datetime :expires_at, null: false
      t.datetime :revoked_at
      t.timestamps
    end
    add_index :mobile_sessions, :token_digest, unique: true
    add_index :mobile_sessions, :provider_token_digest, unique: true

    create_table :auth_identities, id: :string, default: -> { "gen_id('aid')" } do |t|
      t.references :user, type: :string, null: false, foreign_key: true
      t.string :provider, null: false
      t.string :subject, null: false
      t.text :encrypted_refresh_token
      t.timestamps
    end
    add_index :auth_identities, [ :provider, :subject ], unique: true

    create_table :mobile_auth_challenges, id: :string, default: -> { "gen_id('mac')" } do |t|
      t.string :nonce_digest, null: false
      t.datetime :expires_at, null: false
      t.datetime :consumed_at
      t.timestamps
    end
  end
end
