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

  describe '#to_user' do
    context 'when state is invalid' do
      let(:state) { 'invalid_state' }
      it 'returns a Result with an invalid state error' do
        result = service.to_user
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

        context 'when user exists' do
          let!(:existing_user) { User.create!(email: user_email, password: 'password123', full_name: 'Old Name') }

          it 'finds the existing user, updates name, sets session, and returns user in Result' do
            result = service.to_user
            existing_user.reload
            expect(result.user).to eq(existing_user)
            expect(result.error).to be_nil
            expect(result.session[:user_id]).to eq(existing_user.id)
            expect(existing_user.full_name).to eq(user_name)
            expect(session[:user_id]).to eq(existing_user.id)
          end
        end

        context 'when user does not exist' do
          it 'returns a Result with user not found error' do
            result = service.to_user
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
          result = service.to_user
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
          expect { service.to_user }.to raise_error(Google::Auth::IDTokens::VerificationError, "Signature is invalid")
        end

        it 'propagates Google::Auth::ExpiredTokenError' do
          allow(Google::Auth::IDTokens).to receive(:verify_oidc)
            .with('valid_id_token', aud: google_client_id)
            .and_raise(Google::Auth::IDTokens::VerificationError, "Token has expired")
          expect { service.to_user }.to raise_error(Google::Auth::IDTokens::VerificationError, "Token has expired")
        end

        it 'propagates Google::Auth::InvalidIssuerError' do
          allow(Google::Auth::IDTokens).to receive(:verify_oidc)
            .with('valid_id_token', aud: google_client_id)
            .and_raise(Google::Auth::IDTokens::VerificationError, "Issuer is invalid")
          expect { service.to_user }.to raise_error(Google::Auth::IDTokens::VerificationError, "Issuer is invalid")
        end

        it 'propagates Google::Auth::InvalidAudienceError' do
          allow(Google::Auth::IDTokens).to receive(:verify_oidc)
            .with('valid_id_token', aud: google_client_id)
            .and_raise(Google::Auth::IDTokens::VerificationError, "Audience is invalid")
          expect { service.to_user }.to raise_error(Google::Auth::IDTokens::VerificationError, "Audience is invalid")
        end
      end

      context 'when token exchange fails (OAuth2::Error)' do
        before do
          allow(mock_auth_code).to receive(:get_token).with(code)
            .and_raise(OAuth2::Error.new(OpenStruct.new(body: '{"error":"invalid_grant","error_description":"Bad Request"}', status: 400)))
        end

        it 'propagates OAuth2::Error' do
          expect { service.to_user }.to raise_error(OAuth2::Error)
        end
      end
    end
  end
end
