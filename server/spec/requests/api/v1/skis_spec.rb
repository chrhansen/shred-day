# spec/requests/api/v1/skis_spec.rb
require 'rails_helper'

RSpec.describe "Api::V1::Skis", type: :request do
  let!(:user) { create(:user) }
  let!(:other_user) { create(:user) }
  let!(:user_ski1) { create(:ski, user: user, name: "User Ski Alpha") }
  let!(:user_ski2) { create(:ski, user: user, name: "User Ski Beta") }
  let!(:other_user_ski) { create(:ski, user: other_user, name: "Other User Ski") }

  # --- Authentication Helper ---
  def login(user_to_login)
    post api_v1_session_path, params: { email: user_to_login.email, password: user_to_login.password }
    expect(response).to have_http_status(:ok)
  end

  # --- GET /api/v1/skis (Index) ---
  describe "GET /api/v1/skis" do
    context "when authenticated" do
      before { login(user) }

      it "returns ok status and the user's skis" do
        get api_v1_skis_path
        expect(response).to have_http_status(:ok)
        json_response = JSON.parse(response.body)
        expect(json_response.size).to eq(2)
        expect(json_response.map { |s| s['id'] }).to contain_exactly(user_ski1.id, user_ski2.id)
        expect(json_response.map { |s| s['name'] }).to contain_exactly("User Ski Alpha", "User Ski Beta")
      end
    end

    context "when not authenticated" do
      it "returns unauthorized status" do
        get api_v1_skis_path
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end

  # --- POST /api/v1/skis (Create) ---
  describe "POST /api/v1/skis" do
    let(:valid_params) { { ski: { name: "New User Ski" } } }
    let(:invalid_params) { { ski: { name: nil } } }

    context "when authenticated" do
      before { login(user) }

      context "with valid parameters" do
        it "creates a new ski for the user" do
          expect {
            post api_v1_skis_path, params: valid_params
          }.to change(user.skis, :count).by(1)
        end

        it "returns created status and the new ski info" do
          post api_v1_skis_path, params: valid_params
          expect(response).to have_http_status(:created)
          json_response = JSON.parse(response.body)
          expect(json_response['name']).to eq("New User Ski")
          expect(json_response['user_id']).to eq(user.id)
        end
      end

      context "with invalid parameters" do
        it "does not create a new ski" do
          expect {
            post api_v1_skis_path, params: invalid_params
          }.to_not change(Ski, :count)
        end

        it "returns unprocessable_entity status and errors" do
          post api_v1_skis_path, params: invalid_params
          expect(response).to have_http_status(:unprocessable_entity)
          json_response = JSON.parse(response.body)
          expect(json_response['name']).to include("can't be blank")
        end
      end
    end

    context "when not authenticated" do
      it "does not create a ski and returns unauthorized" do
        expect {
          post api_v1_skis_path, params: valid_params
        }.to_not change(Ski, :count)
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end

  # --- PATCH /api/v1/skis/:id (Update) ---
  describe "PATCH /api/v1/skis/:id" do
    let(:valid_update_params) { { ski: { name: "Updated Ski Name" } } }
    let(:invalid_update_params) { { ski: { name: nil } } }

    context "when authenticated" do
      before { login(user) }

      context "updating own ski" do
        context "with valid parameters" do
          it "updates the ski" do
            patch api_v1_ski_path(user_ski1), params: valid_update_params
            user_ski1.reload
            expect(user_ski1.name).to eq("Updated Ski Name")
          end

          it "returns ok status and updated ski info" do
            patch api_v1_ski_path(user_ski1), params: valid_update_params
            expect(response).to have_http_status(:ok)
            json_response = JSON.parse(response.body)
            expect(json_response['name']).to eq("Updated Ski Name")
          end
        end

        context "with invalid parameters" do
          it "does not update the ski" do
            original_name = user_ski1.name
            patch api_v1_ski_path(user_ski1), params: invalid_update_params
            user_ski1.reload
            expect(user_ski1.name).to eq(original_name)
          end

          it "returns unprocessable_entity status and errors" do
            patch api_v1_ski_path(user_ski1), params: invalid_update_params
            expect(response).to have_http_status(:unprocessable_entity)
            json_response = JSON.parse(response.body)
            expect(json_response['name']).to include("can't be blank")
          end
        end
      end

      context "updating another user's ski" do
        it "does not update the ski and returns not_found (or forbidden)" do
          original_name = other_user_ski.name
          patch api_v1_ski_path(other_user_ski), params: valid_update_params
          other_user_ski.reload
          expect(other_user_ski.name).to eq(original_name)
          # Check for 404 Not Found
          expect(response).to have_http_status(:not_found)
        end
      end
    end

    context "when not authenticated" do
      it "returns unauthorized status" do
        patch api_v1_ski_path(user_ski1), params: valid_update_params
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end

  # --- DELETE /api/v1/skis/:id (Destroy) ---
  describe "DELETE /api/v1/skis/:id" do
    context "when authenticated" do
      before { login(user) }

      context "deleting own ski" do
        it "deletes the ski" do
          expect {
            delete api_v1_ski_path(user_ski1)
          }.to change(user.skis, :count).by(-1)
        end

        it "returns no_content status" do
          delete api_v1_ski_path(user_ski1)
          expect(response).to have_http_status(:no_content)
        end
      end

      context "deleting another user's ski" do
        it "does not delete the ski and returns not_found (or forbidden)" do
          expect {
            delete api_v1_ski_path(other_user_ski)
          }.to_not change(Ski, :count)
          # Check for 404 Not Found
          expect(response).to have_http_status(:not_found)
        end
      end
    end

    context "when not authenticated" do
      it "returns unauthorized status" do
        delete api_v1_ski_path(user_ski1)
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end
end
