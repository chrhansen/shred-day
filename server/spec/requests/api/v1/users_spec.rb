# spec/requests/api/v1/users_spec.rb
require 'rails_helper'

RSpec.describe "Api::V1::Users", type: :request do
  describe "POST /api/v1/users" do # Signup
    context "with valid parameters" do
      let(:valid_params) do
        {
          user: {
            email: "newuser@example.com",
            password: "password123",
          }
        }
      end

      it "creates a new user" do
        expect {
          post api_v1_users_path, params: valid_params
        }.to change(User, :count).by(1)
      end

      it "returns created status and user info" do
        post api_v1_users_path, params: valid_params
        expect(response).to have_http_status(:created)

        json_response = JSON.parse(response.body)
        expect(json_response['email']).to eq("newuser@example.com")
        expect(json_response).not_to have_key('password_digest') # Ensure sensitive info isn't returned
      end

      # Test if user is automatically logged in after signup
      it "logs in the new user" do
        post api_v1_users_path, params: valid_params
        expect(session[:user_id]).to eq(User.find_by(email: "newuser@example.com").id)
      end
    end

    context "with invalid parameters" do
      let(:invalid_params) do
        {
          user: {
            email: "invalid-email", # Invalid format
            password: "short" # Too short
          }
        }
      end

      it "does not create a new user" do
        expect {
          post api_v1_users_path, params: invalid_params
        }.to_not change(User, :count)
      end

      it "returns unprocessable_entity status and errors" do
        post api_v1_users_path, params: invalid_params
        expect(response).to have_http_status(:unprocessable_entity)

        json_response = JSON.parse(response.body)
        expect(json_response['errors']).to include("Email is invalid")
        expect(json_response['errors']).to include("Password is too short (minimum is 8 characters)")
      end
    end

    context "when email is already taken" do
      let!(:existing_user) { create(:user, email: "taken@example.com") }
      let(:duplicate_params) do
        {
          user: {
            email: "taken@example.com",
            password: "password123"
          }
        }
      end

      it "does not create a new user" do
        expect {
          post api_v1_users_path, params: duplicate_params
        }.to_not change(User, :count)
      end

      it "returns unprocessable_entity status and error" do
        post api_v1_users_path, params: duplicate_params
        expect(response).to have_http_status(:unprocessable_entity)
        json_response = JSON.parse(response.body)
        expect(json_response['errors']).to include("Email has already been taken")
      end
    end
  end
end
