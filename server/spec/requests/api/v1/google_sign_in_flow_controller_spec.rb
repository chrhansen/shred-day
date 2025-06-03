require 'rails_helper'

RSpec.describe "Api::V1::GoogleSignInFlowController", type: :request do
  # Define the paths directly to avoid issues with helper generation
  let(:google_sign_in_create_path) { '/api/v1/google_sign_in_flow' }
  let(:google_sign_in_update_path) { '/api/v1/google_sign_in_flow' } # Same path, different verb

  describe "POST /api/v1/google_sign_in_flow (create action)" do
    let(:mock_auth_url_service) { instance_double(GoogleAuthUrlService) }
    let(:service_result) { GoogleAuthUrlService::Result.new(auth_url: 'http://fake.google.auth.url/params') }

    before do
      allow(GoogleAuthUrlService).to receive(:new).and_return(mock_auth_url_service)
      allow(mock_auth_url_service).to receive(:auth_url).and_return(service_result)
    end

    it "calls GoogleAuthUrlService and returns the auth URL" do
      post google_sign_in_create_path

      expect(GoogleAuthUrlService).to have_received(:new).with(session: an_instance_of(ActionDispatch::Request::Session))
      expect(mock_auth_url_service).to have_received(:auth_url)
      expect(response).to have_http_status(:ok)
      expect(json_response['url']).to eq('http://fake.google.auth.url/params')
    end

    # Add test for service returning an error if applicable to Result structure
  end

  describe "PATCH /api/v1/google_sign_in_flow (update action)" do
    let(:mock_code_to_user_service) { instance_double(GoogleCodeToUserService) }
    let(:user_attributes) { { id: SecureRandom.uuid, email: 'test@example.com', full_name: 'Test User' } }
    let(:user_instance) { instance_double(User, id: user_attributes[:id], email: user_attributes[:email], full_name: user_attributes[:full_name], as_json: user_attributes.slice(:email, :full_name) ) }

    before do
      allow(GoogleCodeToUserService).to receive(:new).and_return(mock_code_to_user_service)
    end

    context "when GoogleCodeToUserService succeeds" do
      let(:mock_session) { {} }
      let(:service_result) { GoogleCodeToUserService::Result.new(user: user_instance, session: mock_session) }

      before do
        allow(mock_code_to_user_service).to receive(:to_user).and_return(service_result)
      end

      it "calls GoogleCodeToUserService, and returns user info" do
        patch google_sign_in_update_path, params: { code: 'test_code', state: 'test_state' }

        expect(GoogleCodeToUserService).to have_received(:new).with(
          session: an_instance_of(ActionDispatch::Request::Session),
          code: 'test_code',
          state: 'test_state'
        )
        expect(mock_code_to_user_service).to have_received(:to_user)
        expect(response).to have_http_status(:ok)
        expect(json_response['message']).to eq('Signed in successfully')
        expect(json_response['user']['email']).to eq(user_attributes[:email])
        expect(json_response['user']['full_name']).to eq(user_attributes[:full_name])
      end
    end

    context "when GoogleCodeToUserService fails" do
      let(:mock_session) { {} }
      let(:service_result) { GoogleCodeToUserService::Result.new(error: 'Invalid token', session: mock_session) }

      before do
        allow(mock_code_to_user_service).to receive(:to_user).and_return(service_result)
      end

      it "returns an unauthorized status and error message" do
        patch google_sign_in_update_path, params: { code: 'test_code', state: 'test_state' }

        expect(response).to have_http_status(:unauthorized)
        expect(json_response['error']).to eq('Invalid token')
      end
    end
  end

  # Helper to parse JSON responses
  def json_response
    JSON.parse(response.body)
  end
end
