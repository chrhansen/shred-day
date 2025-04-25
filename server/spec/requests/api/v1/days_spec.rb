# spec/requests/api/v1/days_spec.rb
require 'rails_helper'

RSpec.describe "Api::V1::Days", type: :request do
  let!(:user) { create(:user) }
  let!(:resort) { create(:resort) }
  let!(:ski) { create(:ski, user: user) }

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
          # Check for specific attribute errors based on standard Rails error format
          expect(json_response['date']).to include("can't be blank")
          expect(json_response['ski']).to include("must exist")
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
end
