require "rails_helper"

RSpec.describe Users::ConfirmProviderEmailService do
  let(:user) { create(:user, :unconfirmed) }
  let(:claims) { { "email" => user.email.upcase, "email_verified" => true } }

  it "confirms ownership while invalidating a pre-registered password and its sessions" do
    password_session = Mobile::CreateSessionService.new(user).create_session.session
    provider_session = Mobile::CreateSessionService.new(user, authentication_method: "apple").create_session.session
    Users::EmailConfirmationService.new.send_confirmation(user)
    expect(user.reload.email_confirmation_token_digest).to be_present

    described_class.new(user, claims).confirm_email

    expect(user.reload.email_confirmed_at).to be_present
    expect(user.password_confirmed_at).to be_nil
    expect(user.authenticate("password123")).to be(false)
    expect(user.email_confirmation_token_digest).to be_nil
    expect(user.password_session_version).to eq(1)
    expect(password_session.reload.revoked_at).to be_present
    expect(provider_session.reload.revoked_at).to be_nil
  end

  it "preserves an independently confirmed password" do
    user.update!(email_confirmed_at: Time.current, password_confirmed_at: Time.current)
    digest = user.password_digest
    described_class.new(user, claims).confirm_email
    expect(user.reload.password_digest).to eq(digest)
    expect(user).to be_password_confirmed
    expect(user.password_session_version).to eq(0)
  end

  it "does not invalidate a pending password confirmation on subsequent provider sign-in" do
    user.update!(email_confirmed_at: Time.current)
    Users::EmailConfirmationService.new.send_confirmation(user)
    digest = user.reload.email_confirmation_token_digest
    described_class.new(user, claims).confirm_email
    expect(user.reload.email_confirmation_token_digest).to eq(digest)
    expect(user.password_confirmed_at).to be_nil
  end

  it "does not treat an unverified claim or another address as primary email ownership" do
    [claims.merge("email_verified" => false), claims.merge("email" => "another@example.com"), claims.except("email")].each do |untrusted|
      described_class.new(user, untrusted).confirm_email
      expect(user.reload.email_confirmed_at).to be_nil
      expect(user.authenticate("password123")).to eq(user)
    end
  end
end
