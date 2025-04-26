# spec/requests/api/v1/days_spec.rb
require 'rails_helper'

RSpec.describe "Api::V1::Days", type: :request do
  let!(:user) { create(:user) }
  let!(:other_user) { create(:user) } # For authorization tests
  let!(:resort) { create(:resort) }
  let!(:ski) { create(:ski, user: user) }
  let!(:other_ski) { create(:ski, user: user) } # For update tests
  let!(:day) { create(:day, user: user, resort: resort, ski: ski, activity: "Friends") } # Create a day for show/update
  let!(:other_day) { create(:day, user: other_user, resort: resort, ski: ski) } # Day belonging to another user

  describe "POST /api/v1/days" do
    context "when authenticated" do
      before do
        # Log in the user
        post api_v1_session_path, params: { email: user.email, password: user.password }
        expect(response).to have_http_status(:ok)
      end

      context "with valid parameters" do
        let(:valid_params) do
          {
            day: {
              date: Date.today.to_s,
              resort_id: resort.id,
              ski_id: ski.id
            }
          }
        end

        it "creates a new day log for the user" do
          expect {
            post api_v1_days_path, params: valid_params
          }.to change(user.days, :count).by(1)
        end

        it "returns created status and the created day info" do
          post api_v1_days_path, params: valid_params
          expect(response).to have_http_status(:created)

          json_response = JSON.parse(response.body)
          expect(json_response['date']).to eq(Date.today.to_s)
          expect(json_response['resort_id']).to eq(resort.id)
          expect(json_response['ski_id']).to eq(ski.id)
          expect(json_response['user_id']).to eq(user.id)
        end
      end

      context "with invalid parameters" do
        let(:invalid_params) do
          {
            day: {
              date: nil, # Missing date
              resort_id: resort.id,
              ski_id: 999999 # Non-existent ski id
            }
          }
        end

        it "does not create a new day log" do
          expect {
            post api_v1_days_path, params: invalid_params
          }.to_not change(Day, :count)
        end

        it "returns unprocessable_entity status and errors" do
          post api_v1_days_path, params: invalid_params
          expect(response).to have_http_status(:unprocessable_entity)

          json_response = JSON.parse(response.body)
          # Access errors correctly under the 'errors' key
          expect(json_response['errors']['date']).to include("can't be blank")
          expect(json_response['errors']['ski']).to include("must exist")
        end
      end
    end

    context "when not authenticated" do
      let(:valid_params) do # Need params even for unauthorized test
        {
          day: {
            date: Date.today.to_s,
            resort_id: resort.id,
            ski_id: ski.id
          }
        }
      end

      it "does not create a day log" do
        expect {
          post api_v1_days_path, params: valid_params
        }.to_not change(Day, :count)
      end

      it "returns unauthorized status" do
        post api_v1_days_path, params: valid_params
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end

  # --- NEW: GET /api/v1/days/:id (show) ---
  describe "GET /api/v1/days/:id" do
    context "when authenticated" do
      before do
        post api_v1_session_path, params: { email: user.email, password: user.password }
        expect(response).to have_http_status(:ok)
      end

      context "when the day exists and belongs to the user" do
        it "returns the day details including associations" do
          get api_v1_day_path(day)
          expect(response).to have_http_status(:ok)

          json_response = JSON.parse(response.body)
          expect(json_response['id']).to eq(day.id)
          expect(json_response['date']).to eq(day.date.to_s)
          expect(json_response['activity']).to eq("Friends")
          expect(json_response['resort_id']).to eq(resort.id)
          expect(json_response['ski_id']).to eq(ski.id)

          # Check for nested serializer data
          expect(json_response['resort']).to be_present
          expect(json_response['resort']['id']).to eq(resort.id)
          expect(json_response['resort']['name']).to eq(resort.name)
          expect(json_response['ski']).to be_present
          expect(json_response['ski']['id']).to eq(ski.id)
          expect(json_response['ski']['name']).to eq(ski.name)
        end
      end

      context "when the day does not exist" do
        it "returns not found status" do
          get api_v1_day_path("non_existent_id")
          expect(response).to have_http_status(:not_found)
        end
      end

      context "when the day belongs to another user" do
        it "returns not found status" do
          get api_v1_day_path(other_day)
          expect(response).to have_http_status(:not_found) # Controller uses current_user.days.find
        end
      end
    end

    context "when not authenticated" do
      it "returns unauthorized status" do
        get api_v1_day_path(day)
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end

  # --- NEW: PATCH /api/v1/days/:id (update) ---
  describe "PATCH /api/v1/days/:id" do
    context "when authenticated" do
      before do
        post api_v1_session_path, params: { email: user.email, password: user.password }
        expect(response).to have_http_status(:ok)
      end

      context "with valid parameters" do
        let(:valid_update_params) do
          {
            day: {
              activity: "Training", # Change activity
              ski_id: other_ski.id # Change ski
            }
          }
        end

        it "updates the day log" do
          patch api_v1_day_path(day), params: valid_update_params
          day.reload # Reload from DB
          expect(day.activity).to eq("Training")
          expect(day.ski_id).to eq(other_ski.id)
        end

        it "returns ok status and the updated day info" do
          patch api_v1_day_path(day), params: valid_update_params
          expect(response).to have_http_status(:ok)

          json_response = JSON.parse(response.body)
          expect(json_response['id']).to eq(day.id)
          expect(json_response['activity']).to eq("Training")
          expect(json_response['ski_id']).to eq(other_ski.id)
          # Check nested objects are still present
          expect(json_response['resort']['id']).to eq(resort.id)
          expect(json_response['ski']['id']).to eq(other_ski.id)
        end
      end

      context "with invalid parameters" do
        let(:invalid_update_params) do
          {
            day: {
              resort_id: "invalid_resort_id" # Invalid resort ID
            }
          }
        end

        it "does not update the day log" do
          expect {
            patch api_v1_day_path(day), params: invalid_update_params
          }.not_to change { day.reload.attributes } # Check attributes haven't changed
        end

        it "returns unprocessable_entity status and errors" do
          patch api_v1_day_path(day), params: invalid_update_params
          expect(response).to have_http_status(:unprocessable_entity)

          json_response = JSON.parse(response.body)
          expect(json_response['errors']).to be_present
          expect(json_response['errors']['resort']).to include("must exist")
        end
      end

      context "when the day does not exist" do
        it "returns not found status" do
          patch api_v1_day_path("non_existent_id"), params: { day: { activity: "Test" } }
          expect(response).to have_http_status(:not_found)
        end
      end

      context "when the day belongs to another user" do
        it "returns not found status" do
          patch api_v1_day_path(other_day), params: { day: { activity: "Test" } }
          expect(response).to have_http_status(:not_found)
        end
      end
    end

    context "when not authenticated" do
      it "returns unauthorized status" do
        patch api_v1_day_path(day), params: { day: { activity: "Test" } }
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end
end
