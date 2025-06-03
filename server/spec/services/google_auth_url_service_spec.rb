require 'rails_helper'

RSpec.describe GoogleAuthUrlService do
  let(:session) { {} }
  let(:service) { described_class.new(session: session) }

  describe '#auth_url' do
    let(:mock_oauth_client) { instance_double(OAuth2::Client) }
    let(:mock_auth_code) { instance_double(OAuth2::Strategy::AuthCode) }
    let(:expected_auth_url) { 'https://accounts.google.com/o/oauth2/v2/auth?scope=openid%20email%20profile&access_type=offline&prompt=consent&state=test_state&redirect_uri=http://test.host:8080/auth/callback&response_type=code&client_id=test_client_id' }

    before do
      allow(service).to receive(:client).and_return(mock_oauth_client)
      allow(mock_oauth_client).to receive(:auth_code).and_return(mock_auth_code)
      allow(SecureRandom).to receive(:hex).with(24).and_return('test_state')
      allow(service).to receive(:redirect_uri).and_return('http://test.host:8080/auth/callback') # Stubbing redirect_uri for predictability

      allow(mock_auth_code).to receive(:authorize_url).with(
        scope: 'openid email profile',
        access_type: 'offline',
        prompt: 'consent',
        state: 'test_state'
        # redirect_uri is handled by the client initialization if passed there,
        # or should be passed here if client is not configured with it.
        # The service's client IS configured with redirect_uri, so it's not passed to authorize_url directly.
      ).and_return(expected_auth_url)
    end

    it 'generates a state and stores it in the session' do
      service.auth_url
      expect(session[:oauth_state]).to eq('test_state')
    end

    it 'calls the OAuth2 client to authorize the URL with correct parameters' do
      expect(mock_auth_code).to receive(:authorize_url).with(
        hash_including(
          scope: 'openid email profile',
          access_type: 'offline',
          prompt: 'consent',
          state: 'test_state'
        )
      ).and_return(expected_auth_url)
      service.auth_url
    end

    it 'returns a Result object with the auth_url' do
      result = service.auth_url
      expect(result).to be_a(GoogleAuthUrlService::Result)
      expect(result.auth_url).to eq(expected_auth_url)
    end

    context 'when redirect_uri is configured in the client' do
      let(:client_credentials) { { client_id: 'test_client_id', client_secret: 'test_client_secret' } }
      let(:configured_client) do
        OAuth2::Client.new(
          client_credentials[:client_id],
          client_credentials[:client_secret],
          site: 'https://oauth2.googleapis.com',
          authorize_url: 'https://accounts.google.com/o/oauth2/v2/auth',
          token_url: '/token',
          redirect_uri: 'http://test.host:8080/auth/callback' # Important: client is configured with it
        )
      end

      before do
        allow(Rails.application.credentials).to receive(:dig).with(:google, :client_id).and_return(client_credentials[:client_id])
        allow(Rails.application.credentials).to receive(:dig).with(:google, :client_secret).and_return(client_credentials[:client_secret])
        allow(service).to receive(:client).and_return(configured_client) # Use a real client configured with redirect_uri
        allow(service).to receive(:redirect_uri).and_call_original # Let the service determine it, but client uses its own
      end

      it 'authorize_url is called correctly (redirect_uri is implicit from client config)' do
         # We are testing that authorize_url is called on an auth_code object that was derived from a client
         # already configured with a redirect_uri. The OAuth2 gem then doesn't require redirect_uri to be passed
         # explicitly to authorize_url.
        expect_any_instance_of(OAuth2::Strategy::AuthCode).to receive(:authorize_url).with(
          scope: 'openid email profile',
          access_type: 'offline',
          prompt: 'consent',
          state: 'test_state'
        ).and_return(expected_auth_url)
        service.auth_url
      end
    end
  end
end
