require 'rails_helper'
require 'jwt'

RSpec.describe Mobile::ProviderVerificationService do
  let(:key) { OpenSSL::PKey::RSA.generate(2048) }
  let(:jwk) { JWT::JWK.new(key, 'apple-key') }
  let(:claims) { { 'iss' => 'https://appleid.apple.com', 'aud' => 'day.shred', 'sub' => 'apple-sub', 'exp' => 10.minutes.from_now.to_i, 'iat' => Time.current.to_i } }
  def verify(values = claims, signing_key = key)
    token = JWT.encode(values, signing_key, 'RS256', kid: 'apple-key')
    service = described_class.new(provider: 'apple', identity_token: token)
    allow(service).to receive(:apple_keys).and_return({ keys: [ jwk.export ] })
    service.verify_identity
  end
  it('accepts a signed Apple identity for this bundle') { expect(verify).to be_verified }
  it('rejects a bad signature') { expect { verify(claims, OpenSSL::PKey::RSA.generate(2048)) }.to raise_error(described_class::VerificationError) }
  it('rejects another bundle') { expect { verify(claims.merge('aud' => 'another.app')) }.to raise_error(described_class::VerificationError) }
  it('rejects another issuer') { expect { verify(claims.merge('iss' => 'https://attacker.example')) }.to raise_error(described_class::VerificationError) }
  it('rejects expired proof') { expect { verify(claims.merge('exp' => 1.second.ago.to_i)) }.to raise_error(described_class::VerificationError) }
  it('requires recent proof') { expect { verify(claims.merge('iat' => 11.minutes.ago.to_i)) }.to raise_error(described_class::VerificationError) }
  it 'uses Google signature and audience verification' do
    allow(Rails.application.credentials).to receive(:dig).with(:google, :client_id).and_return('web-client')
    expect(Google::Auth::IDTokens).to receive(:verify_oidc).with('google-token', aud: 'web-client').and_return(claims)
    expect(described_class.new(provider: 'google', identity_token: 'google-token').verify_identity).to be_verified
  end
  it 'rejects unsupported providers' do
    expect { described_class.new(provider: 'invalid', identity_token: 'token').verify_identity }.to raise_error(described_class::VerificationError)
  end
end
