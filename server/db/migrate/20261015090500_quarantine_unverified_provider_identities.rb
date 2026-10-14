class QuarantineUnverifiedProviderIdentities < ActiveRecord::Migration[8.0]
  def change
    add_column :auth_identities, :ownership_verified_at, :datetime
    add_reference :mobile_sessions, :auth_identity, type: :string, foreign_key: true
  end
end
