require 'rails_helper'

RSpec.describe "Api::V1::Accounts", type: :request do
  let!(:user) { create(:user, season_start_day: "09-01") } # Default season_start_day

  describe "GET /api/v1/account" do
    context "when authenticated" do
      before do
        post api_v1_sessions_path, params: { email: user.email, password: user.password }
        expect(response).to have_http_status(:ok)
        get "/api/v1/account" # Make the actual request after login
      end

      it "returns a 200 OK status" do
        expect(response).to have_http_status(:ok)
      end

      it "returns the user's account details" do
        json_response = JSON.parse(response.body)
        expect(json_response["id"]).to eq(user.id)
        expect(json_response["email"]).to eq(user.email)
        expect(json_response["season_start_day"]).to eq("09-01")
        expect(json_response).to include("created_at")
      end

      it "includes available_seasons field and it is an array" do
        json_response = JSON.parse(response.body)
        expect(json_response).to have_key("available_seasons")
        expect(json_response["available_seasons"]).to be_an(Array)
      end

      # Detailed calculation tests for available_seasons are moved to service_spec.rb
    end

    context "when not authenticated" do
      before { get "/api/v1/account" }

      it "returns a 401 Unauthorized status" do
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end

  describe "PATCH /api/v1/account" do
    let(:valid_attributes) { { user: { season_start_day: "10-15" } } }
    let(:invalid_attributes) { { user: { season_start_day: "99-99" } } }

    context "when authenticated" do
      before do
        post api_v1_sessions_path, params: { email: user.email, password: user.password }
        expect(response).to have_http_status(:ok)
      end

      context "with valid parameters" do
        before { patch "/api/v1/account", params: valid_attributes }

        it "updates the season_start_day" do
          expect(user.reload.season_start_day).to eq("10-15")
        end

        it "returns a 200 OK status" do
          expect(response).to have_http_status(:ok)
        end

        it "returns the updated user details" do
          json_response = JSON.parse(response.body)
          expect(json_response["season_start_day"]).to eq("10-15")
        end

        it "includes recalculated available_seasons in response and it is an array" do
          json_response = JSON.parse(response.body)
          expect(json_response).to have_key("available_seasons")
          expect(json_response["available_seasons"]).to be_an(Array)
        end
      end

      context "with invalid parameters" do
        before { patch "/api/v1/account", params: invalid_attributes }

        it "does not update the season_start_day" do
          expect(user.reload.season_start_day).to eq("09-01") # Remains original
        end

        it "returns a 422 Unprocessable Entity status" do
          expect(response).to have_http_status(:unprocessable_entity)
        end

        it "returns an error message" do
          json_response = JSON.parse(response.body)
          expect(json_response["errors"]).to include("Season start day must be a valid date in MM-DD format (e.g., 09-15)")
        end
      end
    end

    context "when not authenticated" do
      before { patch "/api/v1/account", params: valid_attributes } # No login, no headers

      it "does not update the season_start_day" do
        expect(user.reload.season_start_day).to eq("09-01")
      end

      it "returns a 401 Unauthorized status" do
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end
end
