require 'rails_helper'
require 'ostruct' # For mocking OAuth2::Error response body

RSpec.describe GoogleCodeToUserService do
  let(:session) { { oauth_state: 'test_state' } }
  let(:code) { 'valid_auth_code' }
  let(:state) { 'test_state' }
  let(:service) { described_class.new(session: session, code: code, state: state) }

  let(:mock_oauth_client) { instance_double(OAuth2::Client) }
  let(:mock_auth_code) { instance_double(OAuth2::Strategy::AuthCode) }
  let(:mock_token_response) { instance_double(OAuth2::AccessToken, params: { 'id_token' => 'valid_id_token' }) }

  let(:google_client_id) { 'test_google_client_id.apps.googleusercontent.com' }
  let(:user_email) { 'testuser@example.com' }
  let(:user_name) { 'Test User' }
  let(:google_user_id) { 'test_google_user_id_from_sub' }

  let(:validator_payload) do # Payload expected from Google::Auth::IDTokens.verify_oidc
    {
      'iss' => 'https://accounts.google.com',
      'aud' => google_client_id,
      'email' => user_email,
      'name' => user_name,
      'sub' => google_user_id,
      'exp' => Time.now.to_i + 3600,
      'email_verified' => true
    }
  end

  before do
    allow(service).to receive(:client).and_return(mock_oauth_client)
    allow(mock_oauth_client).to receive(:auth_code).and_return(mock_auth_code)
    allow(Rails.application.credentials).to receive(:dig).with(:google, :client_id).and_return(google_client_id)
    allow(service).to receive(:redirect_uri).and_return('http://test.host:8080/auth/callback')
  end

  describe '#to_local_user' do
    context 'when state is invalid' do
      let(:state) { 'invalid_state' }
      it 'returns a Result with an invalid state error' do
        result = service.to_local_user
        expect(result.error).to eq('Invalid state')
        expect(result.user).to be_nil
        expect(session[:oauth_state]).to be_nil
      end
    end

    context 'when state is valid' do
      before do
        allow(mock_auth_code).to receive(:get_token).with(code).and_return(mock_token_response)
      end

      context 'with successful ID token validation via Google::Auth::IDTokens.verify_oidc' do
        before do
          allow(Google::Auth::IDTokens).to receive(:verify_oidc)
            .with('valid_id_token', aud: google_client_id)
            .and_return(validator_payload)
        end

        it 'uses the established provider subject when Google changes email' do
          owner = create(:user, email: 'original@example.com')
          owner.auth_identities.create!(provider: 'google', subject: google_user_id, ownership_verified_at: Time.current)
          expect { expect(service.to_local_user.user).to eq(owner) }.not_to change(User, :count)
          expect(session[:user_id]).to eq(owner.id)
        end

        it 'rejects an unverified email without creating an account, identity, or session' do
          validator_payload['email_verified'] = false
          expect { expect(service.to_local_user).not_to be_signed_in }.not_to change(User, :count)
          expect(AuthIdentity.count).to eq(0)
          expect(session[:user_id]).to be_nil
        end

        it 'continues trusting a verified stable subject when Google omits email later' do
          owner = create(:user)
          owner.auth_identities.create!(provider: 'google', subject: google_user_id, ownership_verified_at: Time.current)
          validator_payload.delete('email')
          validator_payload.delete('email_verified')
          result = service.to_local_user
          expect(result.user).to eq(owner)
          expect(session[:auth_identity_id]).to eq(owner.auth_identities.first.id)
          expect(session[:authentication_method]).to eq('google')
        end

        it 'quarantines a legacy subject whose fresh email does not prove the primary address' do
          owner = create(:user, :unconfirmed, email: 'primary@example.com')
          identity = owner.auth_identities.create!(provider: 'google', subject: google_user_id)
          result = service.to_local_user
          expect(result).not_to be_signed_in
          expect(result.error).to include('ownership verification')
          expect(identity.reload.ownership_verified_at).to be_nil
          expect(session[:user_id]).to be_nil
        end

        it 'uses verified ownership to invalidate an unconfirmed password, preserving immediate Google sign-in' do
          user = create(:user, :unconfirmed, email: user_email)
          expect(service.to_local_user.user).to eq(user)
          expect(session[:authentication_method]).to eq('google')
          expect(session[:auth_identity_id]).to eq(user.auth_identities.first.id)
          expect(user.auth_identities.first).to be_ownership_verified
          expect(user.reload.email_confirmed_at).to be_present
          expect(user.password_confirmed_at).to be_nil
          expect(user.authenticate('password123')).to be(false)
        end

        it 'matches a legacy mixed-case email only after verification' do
          user = create(:user, email: user_email.upcase)
          expect(service.to_local_user.user).to eq(user)
          expect(User.count).to eq(1)
        end

        it 'does not choose between ambiguous legacy email matches' do
          create(:user, email: user_email)
          duplicate = create(:user)
          duplicate.update_columns(email: user_email.upcase)
          expect(service.to_local_user.error).to eq('Multiple accounts use this email. Please contact support.')
          expect(AuthIdentity.count).to eq(0)
          expect(session[:user_id]).to be_nil
        end

        context 'when user exists' do
          let!(:existing_user) { User.create!(email: user_email, password: 'password123', full_name: 'Old Name') }

          it 'finds the existing user, updates name, sets session, and returns user in Result' do
            result = service.to_local_user
            existing_user.reload
            expect(result.user).to eq(existing_user)
            expect(result.error).to be_nil
            expect(result.session[:user_id]).to eq(existing_user.id)
            expect(existing_user.full_name).to eq(user_name)
            expect(session[:user_id]).to eq(existing_user.id)
          end
        end

        context 'when user does not exist' do
          it 'creates a new user, sets session, and returns user in Result' do
            expect {
              result = service.to_local_user
              expect(result.user).to be_present
              expect(result.user.email).to eq(user_email.downcase)
              expect(result.user.full_name).to eq(user_name)
              expect(result.user.password_digest).to be_present # Should have a password set
              expect(result.error).to be_nil
              expect(result.session[:user_id]).to eq(result.user.id)
              expect(session[:user_id]).to eq(result.user.id)
            }.to change(User, :count).by(1)
          end

          it 'sets a secure random password for the new user' do
            result = service.to_local_user
            new_user = result.user
            expect(new_user.password_digest).to be_present
            expect(new_user.authenticate('wrong_password')).to be_falsey
            # We can't easily test the exact password since it's randomly generated
            # but we can verify it's properly hashed
          end
        end

        context 'when user creation fails due to validation errors' do
          before do
            # Mock a user that fails to save
            creator = instance_double(Users::CreateUserService)
            failed = Users::CreateUserService::Result.new(nil, false, ["Email is invalid"])
            allow(Users::CreateUserService).to receive(:new).and_return(creator)
            allow(creator).to receive(:create_user).and_return(failed)
          end

          it 'returns a Result with user not found error' do
            result = service.to_local_user
            expect(result.error).to eq('User not found')
            expect(result.user).to be_nil
            expect(session[:user_id]).to be_nil
          end
        end
      end

      context 'when ID token is missing from Google response' do
        let(:mock_token_response) { instance_double(OAuth2::AccessToken, params: {}) } # No id_token
        it 'returns a Result with an error and does not call verify_oidc' do
          expect(Google::Auth::IDTokens).not_to receive(:verify_oidc)
          result = service.to_local_user
          expect(result.error).to eq('ID token not found in Google response')
        end
      end

      context 'when Google::Auth::IDTokens.verify_oidc raises an error' do
        # These tests assume the service does NOT explicitly rescue these specific exceptions.
        # If it did, the tests would change to `expect(result.error).to eq(...)`

        it 'propagates Google::Auth::SignatureError' do
          allow(Google::Auth::IDTokens).to receive(:verify_oidc)
            .with('valid_id_token', aud: google_client_id)
            .and_raise(Google::Auth::IDTokens::VerificationError, "Signature is invalid")
          expect { service.to_local_user }.to raise_error(Google::Auth::IDTokens::VerificationError, "Signature is invalid")
        end

        it 'propagates Google::Auth::ExpiredTokenError' do
          allow(Google::Auth::IDTokens).to receive(:verify_oidc)
            .with('valid_id_token', aud: google_client_id)
            .and_raise(Google::Auth::IDTokens::VerificationError, "Token has expired")
          expect { service.to_local_user }.to raise_error(Google::Auth::IDTokens::VerificationError, "Token has expired")
        end

        it 'propagates Google::Auth::InvalidIssuerError' do
          allow(Google::Auth::IDTokens).to receive(:verify_oidc)
            .with('valid_id_token', aud: google_client_id)
            .and_raise(Google::Auth::IDTokens::VerificationError, "Issuer is invalid")
          expect { service.to_local_user }.to raise_error(Google::Auth::IDTokens::VerificationError, "Issuer is invalid")
        end

        it 'propagates Google::Auth::InvalidAudienceError' do
          allow(Google::Auth::IDTokens).to receive(:verify_oidc)
            .with('valid_id_token', aud: google_client_id)
            .and_raise(Google::Auth::IDTokens::VerificationError, "Audience is invalid")
          expect { service.to_local_user }.to raise_error(Google::Auth::IDTokens::VerificationError, "Audience is invalid")
        end
      end

      context 'when token exchange fails (OAuth2::Error)' do
        before do
          allow(mock_auth_code).to receive(:get_token).with(code)
            .and_raise(OAuth2::Error.new(OpenStruct.new(body: '{"error":"invalid_grant","error_description":"Bad Request"}', status: 400)))
        end

        it 'propagates OAuth2::Error' do
          expect { service.to_local_user }.to raise_error(OAuth2::Error)
        end
      end
    end
  end
end
