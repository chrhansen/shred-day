require 'rails_helper'

RSpec.describe Mobile::ProviderSignInService do
  let(:claims) { { 'sub' => 'google-subject', 'email' => 'skier@gmail.com', 'email_verified' => true } }
  let(:verifier) { instance_double(Mobile::ProviderVerificationService) }
  let(:verified) { Mobile::ProviderVerificationService::Result.new(claims) }
  before do
    allow(Mobile::ProviderVerificationService).to receive(:new).and_return(verifier)
    allow(verifier).to receive(:verify_identity).and_return(verified)
  end
  def google(token: 'google-id-token', user: nil)
    described_class.new(provider: 'google', identity_token: token, user: user).sign_in
  end

  it 'creates one account with default tags and a subject identity' do
    result = google
    expect(result).to be_signed_in
    user = result.session_result.session.user
    expect(user.tags).to be_present
    expect(user.auth_identities.first.subject).to eq(claims['sub'])
  end

  it 'finds the provider identity even if its email changes' do
    original = google.session_result.session.user
    claims['email'] = 'new@gmail.com'
    expect(google(token: 'another-token').session_result.session.user).to eq(original)
    expect(User.count).to eq(1)
  end

  it 'links an authoritative Google email to its existing account' do
    user = create(:user, email: claims['email'])
    expect(google.session_result.session.user).to eq(user)
  end

  it 'requires authenticated linking for a non-authoritative existing email' do
    claims['email'] = 'skier@example.com'
    user = create(:user, email: claims['email'])
    expect(google).not_to be_signed_in
    expect(google(user: user).session_result.session.user).to eq(user)
  end

  it 'recognizes an identity established by existing web Google login' do
    claims['email'] = 'skier@example.com'
    user = create(:user, email: claims['email'])
    user.auth_identities.create!(provider: 'google', subject: claims['sub'])
    expect(google.session_result.session.user).to eq(user)
  end

  it 'rejects an identity belonging to another logged-in account' do
    owner = google.session_result.session.user
    expect(google(token: 'new-token', user: create(:user))).not_to be_signed_in
    expect(AuthIdentity.last.user).to eq(owner)
  end

  it 'rejects replayed provider proof' do
    expect(google).to be_signed_in
    expect(google).not_to be_signed_in
    expect(MobileSession.count).to eq(1)
  end

  it 'rejects an unverified email for new accounts' do
    claims['email_verified'] = false
    expect(google).not_to be_signed_in
    expect(User.count).to eq(0)
  end

  context 'Apple login' do
    let(:nonce) { 'random-apple-nonce' }
    let(:claims) { { 'sub' => 'apple-subject', 'email' => 'private@privaterelay.appleid.com', 'email_verified' => 'true', 'nonce' => nonce } }
    let(:challenge) { MobileAuthChallenge.create!(nonce_digest: Digest::SHA256.hexdigest(nonce), expires_at: 5.minutes.from_now) }
    let(:exchange) { instance_double(Mobile::AppleTokenService) }
    before do
      allow(Mobile::AppleTokenService).to receive(:new).and_return(exchange)
      allow(exchange).to receive(:exchange_code).with('authorization-code').and_return(Mobile::AppleTokenService::Result.new('refresh-secret', 'exchanged-id-token'))
    end
    def apple(challenge_id: challenge.id)
      described_class.new(provider: 'apple', identity_token: 'apple-id-token', authorization_code: 'authorization-code', challenge_id: challenge_id).sign_in
    end
    it 'consumes the nonce and encrypts the revocable provider credential' do
      expect(apple).to be_signed_in
      identity = AuthIdentity.last
      expect(identity.refresh_token).to eq('refresh-secret')
      expect(identity.encrypted_refresh_token).not_to include('refresh-secret')
      expect(challenge.reload.consumed_at).to be_present
      expect(apple).not_to be_signed_in
    end
    it 'rejects an expired challenge' do
      challenge.update!(expires_at: 1.second.ago)
      expect(apple).not_to be_signed_in
    end
    it 'rejects a missing or mismatched nonce' do
      claims['nonce'] = 'wrong'
      expect(apple).not_to be_signed_in
      expect(User.count).to eq(0)
    end
    it 'does not link a new Apple identity by matching email alone' do
      create(:user, email: claims['email'])
      expect(apple).not_to be_signed_in
    end
    it 'rejects an authorization code for a different subject' do
      mismatch = Mobile::ProviderVerificationService::Result.new(claims.merge('sub' => 'someone-else'))
      allow(verifier).to receive(:verify_identity).and_return(verified, mismatch)
      expect(apple).not_to be_signed_in
      expect(AuthIdentity.count).to eq(0)
      expect(User.count).to eq(0)
    end
  end
end
