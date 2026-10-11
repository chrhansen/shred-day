require 'rails_helper'

RSpec.describe Users::DeleteAccountService do
  let(:user) { create(:user) }
  it 'revokes Apple authorization before deleting the account' do
    identity = user.auth_identities.build(provider: 'apple', subject: 'apple-sub')
    identity.refresh_token = 'refresh-secret'; identity.save!
    apple = instance_double(Mobile::AppleTokenService)
    allow(Mobile::AppleTokenService).to receive(:new).and_return(apple)
    expect(apple).to receive(:revoke_token).with('refresh-secret')
    expect(described_class.new(user).delete_account).to be_deleted
    expect(AuthIdentity.count).to eq(0)
  end
  it 'preserves data when Apple revocation fails' do
    identity = user.auth_identities.build(provider: 'apple', subject: 'apple-sub')
    identity.refresh_token = 'refresh-secret'; identity.save!
    apple = instance_double(Mobile::AppleTokenService)
    allow(Mobile::AppleTokenService).to receive(:new).and_return(apple)
    allow(apple).to receive(:revoke_token).and_raise(Mobile::AppleTokenService::ExchangeError, 'temporarily unavailable')
    expect(described_class.new(user).delete_account).not_to be_deleted
    expect(User.exists?(user.id)).to eq(true)
  end
end
