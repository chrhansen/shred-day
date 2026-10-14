require 'rails_helper'

RSpec.describe Mobile::ProviderSignInService do
  let(:claims) { { 'sub' => 'google-subject', 'email' => 'skier@gmail.com', 'email_verified' => true } }
  let(:verifier) { instance_double(Mobile::ProviderVerificationService) }
  let(:verified) { Mobile::ProviderVerificationService::Result.new(claims) }
  before do
    allow(Mobile::ProviderVerificationService).to receive(:new).and_return(verifier)
    allow(verifier).to receive(:verify_identity).and_return(verified)
  end
  def google(token: 'google-id-token', user: nil, session: nil)
    session ||= Mobile::CreateSessionService.new(user).create_session.session if user
    described_class.new(provider: 'google', identity_token: token, session: session).sign_in
  end

  it 'creates one account with default tags and a subject identity' do
    result = google
    expect(result).to be_signed_in
    user = result.session_result.session.user
    expect(user.tags).to be_present
    expect(user.auth_identities.first.subject).to eq(claims['sub'])
    expect(user.auth_identities.first).to be_ownership_verified
    expect(result.session_result.session.auth_identity_id).to eq(user.auth_identities.first.id)
  end

  it 'finds the provider identity even if its email changes' do
    original = google.session_result.session.user
    claims['email'] = 'new@gmail.com'
    other = create(:user, email: claims['email'])
    expect(google(token: 'another-token').session_result.session.user).to eq(original)
    expect(other.auth_identities).to be_empty
    expect(User.count).to eq(2)
  end

  it 'links an authoritative Google email to its existing account' do
    user = create(:user, email: claims['email'])
    expect(google.session_result.session.user).to eq(user)
  end

  it 'recovers an unconfirmed password account without confirming its provisional password' do
    user = create(:user, :unconfirmed, email: claims['email'])
    old = Mobile::CreateSessionService.new(user).create_session.session
    result = google
    expect(result).to be_signed_in
    expect(result.session_result.session.authentication_method).to eq('google')
    expect(user.reload.email_confirmed_at).to be_present
    expect(user.password_confirmed_at).to be_nil
    expect(user.authenticate('password123')).to be(false)
    expect(old.reload.revoked_at).to be_present
  end

  it 'signs in to an existing password account using a verified custom-domain Google email' do
    claims['email'] = 'skier@example.com'
    user = create(:user, email: claims['email'])
    day = create(:day, :with_skis, :with_tags, user: user, tag_names: ['Training'])
    ski_ids, tag_ids = user.skis.ids, user.tags.ids
    password_digest = user.password_digest
    result = google
    expect(result).to be_signed_in
    expect(result.session_result.session.user).to eq(user)
    expect(result.session_result.session.authentication_method).to eq('google')
    expect(user.auth_identities.find_by!(provider: 'google').subject).to eq(claims['sub'])
    expect(user.reload.password_digest).to eq(password_digest)
    expect(user.authenticate('password123')).to eq(user)
    expect(user.days.ids).to eq([day.id])
    expect(user.skis.ids).to match_array(ski_ids)
    expect(user.tags.ids).to match_array(tag_ids)
    expect(User.count).to eq(1)
  end

  it 'matches normalized verified Google email against a legacy mixed-case account' do
    user = create(:user, email: 'Skier@Example.COM')
    claims['email'] = '  SKIER@example.com  '
    expect(google.session_result.session.user).to eq(user)
    expect(User.count).to eq(1)
  end

  it 'signs in with Google to an account first created with Apple' do
    claims['email'] = 'skier@example.com'
    user = create(:user, email: claims['email'])
    user.auth_identities.create!(provider: 'apple', subject: 'existing-apple-subject')
    expect(google.session_result.session.user).to eq(user)
    expect(user.auth_identities.pluck(:provider)).to contain_exactly('apple', 'google')
    expect(User.count).to eq(1)
  end

  it 'rejects ambiguous normalized email matches without choosing or merging accounts' do
    first = create(:user, email: 'skier@gmail.com')
    second = create(:user)
    second.update_columns(email: 'SKIER@GMAIL.COM')
    claims['email'] = first.email
    result = google
    expect(result).not_to be_signed_in
    expect(result.error).to eq('Multiple accounts use this email. Please contact support.')
    expect(User.count).to eq(2)
    expect(AuthIdentity.count).to eq(0)
    expect(MobileSession.count).to eq(0)
  end

  [false, 'false', nil, 'TRUE', 1].each do |unverified|
    it "rejects an existing email without a verified claim (#{unverified.inspect})" do
      create(:user, email: claims['email'])
      claims['email_verified'] = unverified
      result = google
      expect(result).not_to be_signed_in
      expect(result.error).to eq('A verified email is required to sign in')
      expect(AuthIdentity.count).to eq(0)
      expect(MobileSession.count).to eq(0)
      expect(User.count).to eq(1)
    end
  end

  it 'rolls back a concurrent provider-identity uniqueness failure without changing the existing account' do
    user = create(:user, email: claims['email'])
    password_digest = user.password_digest
    allow_any_instance_of(AuthIdentity).to receive(:save!).and_raise(ActiveRecord::RecordNotUnique)
    expect(google).not_to be_signed_in
    expect(user.reload.password_digest).to eq(password_digest)
    expect(AuthIdentity.count).to eq(0)
    expect(MobileSession.count).to eq(0)
    expect(User.count).to eq(1)
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

  it 'requires recent existing-account authentication before linking a new identity' do
    session = Mobile::CreateSessionService.new(create(:user)).create_session.session
    session.update!(created_at: 10.minutes.ago)
    expect(google(session: session)).not_to be_signed_in
    expect(AuthIdentity.count).to eq(0)
  end

  it 'quarantines a legacy identity whose fresh proof verifies a different primary email' do
    user = create(:user, :unconfirmed, email: 'victim@example.com')
    identity = user.auth_identities.create!(provider: 'google', subject: claims['sub'])
    result = google
    expect(result).not_to be_signed_in
    expect(result.error).to include('ownership verification')
    expect(identity.reload.ownership_verified_at).to be_nil
    expect(MobileSession.count).to eq(0)
    expect(user.reload.email_confirmed_at).to be_nil
  end

  it 'allows the same confirmed account to reconnect its quarantined identity with fresh password proof' do
    user = create(:user, email: 'primary@example.com')
    identity = user.auth_identities.create!(provider: 'google', subject: claims['sub'])
    fresh = Mobile::CreateSessionService.new(user).create_session.session
    result = google(session: fresh)
    expect(result).to be_signed_in
    expect(identity.reload).to be_ownership_verified
    expect(result.session_result.session.auth_identity_id).to eq(identity.id)
    expect(result.session_result.session.user).to eq(user)
  end

  it 'does not allow a quarantined provider session to authorize another connection' do
    user = create(:user)
    identity = user.auth_identities.create!(provider: 'apple', subject: 'old-apple-subject')
    legacy = Mobile::CreateSessionService.new(user, authentication_method: 'apple', auth_identity: identity).create_session.session
    expect(google(session: legacy)).not_to be_signed_in
    expect(user.auth_identities.count).to eq(1)
  end

  it 'does not reconnect a quarantined identity through a stale password credential version' do
    user = create(:user, email: 'primary@example.com')
    identity = user.auth_identities.create!(provider: 'google', subject: claims['sub'])
    old = Mobile::CreateSessionService.new(user).create_session.session
    user.increment!(:password_session_version)
    expect(google(session: old)).not_to be_signed_in
    expect(identity.reload.ownership_verified_at).to be_nil
  end

  it 'does not let linking establish authentication for another link' do
    user = create(:user)
    linked = google(user: user).session_result.session
    expect(linked.authentication_method).to eq('linked_google')
    claims['sub'] = 'another-provider-subject'
    expect(google(token: 'another-proof', session: linked)).not_to be_signed_in
    expect(user.auth_identities.count).to eq(1)
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
    def apple(challenge_id: challenge.id, session: nil)
      described_class.new(provider: 'apple', identity_token: 'apple-id-token', authorization_code: 'authorization-code', challenge_id: challenge_id, session: session).sign_in
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
    it 'signs in to an existing password account using its verified Apple email' do
      user = create(:user, email: claims['email'])
      password_digest = user.password_digest
      result = apple
      expect(result).to be_signed_in
      expect(result.session_result.session.user).to eq(user)
      expect(result.session_result.session.authentication_method).to eq('apple')
      expect(user.auth_identities.find_by!(provider: 'apple').subject).to eq(claims['sub'])
      expect(user.reload.password_digest).to eq(password_digest)
      expect(user.authenticate('password123')).to eq(user)
      expect(User.count).to eq(1)
    end
    it 'recovers an unconfirmed account through Apple without authorizing its provisional password' do
      user = create(:user, :unconfirmed, email: claims['email'])
      result = apple
      expect(result).to be_signed_in
      expect(result.session_result.session.user).to eq(user)
      expect(result.session_result.session.authentication_method).to eq('apple')
      expect(user.reload.email_confirmed_at).to be_present
      expect(user.password_confirmed_at).to be_nil
      expect(user.authenticate('password123')).to be(false)
    end
    it 'signs in with Apple to an existing Google account with the same verified email' do
      claims['email'] = '  SKIER@example.com  '
      user = create(:user, email: 'Skier@Example.COM')
      user.auth_identities.create!(provider: 'google', subject: 'existing-google-subject')
      expect(apple.session_result.session.user).to eq(user)
      expect(user.auth_identities.pluck(:provider)).to contain_exactly('google', 'apple')
      expect(User.count).to eq(1)
    end
    it 'does not infer an account match from an unrelated Apple relay address' do
      existing = create(:user, email: 'skier@example.com')
      result = apple
      expect(result).to be_signed_in
      expect(result.session_result.session.user).not_to eq(existing)
      expect(result.session_result.session.user.email).to eq(claims['email'])
      expect(existing.auth_identities).to be_empty
      expect(User.count).to eq(2)
    end
    it 'rejects an unverified Apple email even when it matches an existing account' do
      create(:user, email: claims['email'])
      claims['email_verified'] = 'false'
      result = apple
      expect(result).not_to be_signed_in
      expect(result.error).to eq('A verified email is required to sign in')
      expect(AuthIdentity.count).to eq(0)
      expect(MobileSession.count).to eq(0)
      expect(challenge.reload.consumed_at).to be_nil
      expect(exchange).not_to have_received(:exchange_code)
    end
    it 'rolls back an existing-email match when Apple authorization exchange fails' do
      user = create(:user, email: claims['email'])
      allow(exchange).to receive(:exchange_code).and_raise(Mobile::AppleTokenService::ExchangeError, 'Apple authorization is temporarily unavailable')
      expect(apple).not_to be_signed_in
      expect(user.auth_identities).to be_empty
      expect(MobileSession.count).to eq(0)
      expect(challenge.reload.consumed_at).to be_nil
      expect(User.count).to eq(1)
    end
    it 'requires recent existing-account authentication to link Apple' do
      session = Mobile::CreateSessionService.new(create(:user)).create_session.session
      session.update!(created_at: 10.minutes.ago)
      expect(apple(session: session)).not_to be_signed_in
      expect(exchange).not_to have_received(:exchange_code)
      expect(AuthIdentity.count).to eq(0)
    end
    it 'reauthenticates a returning linked Apple identity without email' do
      user = create(:user)
      user.auth_identities.create!(provider: 'apple', subject: claims['sub'], ownership_verified_at: Time.current)
      session = Mobile::CreateSessionService.new(user).create_session.session
      session.update!(created_at: 10.minutes.ago)
      claims.delete('email')
      result = apple(session: session)
      expect(result).to be_signed_in
      expect(result.session_result.session.user).to eq(user)
      expect(result.session_result.session.authentication_method).to eq('apple')
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
