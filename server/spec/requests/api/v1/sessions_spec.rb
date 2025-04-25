# spec/requests/api/v1/sessions_spec.rb
require 'rails_helper'

RSpec.describe "Api::V1::Sessions", type: :request do
  let!(:user) { create(:user, email: 'test@example.com', password: 'password123') }

  describe "POST /api/v1/session" do # Login
    context "with valid credentials" do
      let(:valid_params) { { email: 'test@example.com', password: 'password123' } }

      it "logs in the user and returns user info" do
        post api_v1_session_path, params: valid_params
        expect(response).to have_http_status(:ok)

        json_response = JSON.parse(response.body)
        expect(json_response['user']).to include(
          'id' => user.id,
          'email' => user.email
          # Add other expected user fields if applicable
        )
        expect(session[:user_id]).to eq(user.id)
      end
    end

    context "with invalid password" do
      let(:invalid_params) { { email: 'test@example.com', password: 'wrongpassword' } }

      it "returns unauthorized status" do
        post api_v1_session_path, params: invalid_params
        expect(response).to have_http_status(:unauthorized)
      end
    end

    context "with non-existent email" do
      let(:invalid_params) { { email: 'nosuchuser@example.com', password: 'password123' } }

      it "returns unauthorized status" do
        post api_v1_session_path, params: invalid_params
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end

  describe "DELETE /api/v1/session" do # Logout
    context "when user is logged in" do
      before do
        # Log in the user first
        post api_v1_session_path, params: { email: user.email, password: user.password }
        expect(response).to have_http_status(:ok)
      end

      it "logs out the user" do
        delete api_v1_session_path
        expect(response).to have_http_status(:ok)
        # Check session is cleared
        get api_v1_stats_path # Example request requiring auth
        expect(response).to have_http_status(:unauthorized)
      end
    end

    context "when user is not logged in" do
      it "returns unauthorized status (or potentially another status)" do
        delete api_v1_session_path
        # Adjust expected status based on your ApplicationController's behavior for unauthenticated DELETE
        expect(response).to have_http_status(:unauthorized) # Or :no_content etc.
      end
    end
  end
end
