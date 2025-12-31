require 'rails_helper'

RSpec.describe "Api::V1::SharedDays", type: :request do
  let!(:user) { create(:user) }
  let!(:other_user) { create(:user) }
  let!(:resort) { create(:resort) }
  let!(:day) { create(:day, user: user, resort: resort, shared_at: Time.current) }
  let!(:unshared_day) { create(:day, user: user, resort: resort, shared_at: nil) }
  let!(:other_user_day) { create(:day, user: other_user, resort: resort, shared_at: nil) }

  describe "GET /api/v1/shared_days/:id" do
    it "returns the shared day when shared_at is present" do
      get api_v1_shared_day_path(day.id)
      expect(response).to have_http_status(:ok)
      json_response = JSON.parse(response.body)
      expect(json_response['id']).to eq(day.id)
      expect(json_response['shared_at']).to be_present
    end

    it "returns 404 when day is not shared" do
      get api_v1_shared_day_path(unshared_day.id)
      expect(response).to have_http_status(:not_found)
    end

    it "returns 404 when day does not exist" do
      get api_v1_shared_day_path('day_missing')
      expect(response).to have_http_status(:not_found)
    end

    it "accepts short ids without the day_ prefix" do
      short_id = day.id.delete_prefix('day_')
      get api_v1_shared_day_path(short_id)
      expect(response).to have_http_status(:ok)
      json_response = JSON.parse(response.body)
      expect(json_response['id']).to eq(day.id)
    end
  end

  describe "POST /api/v1/shared_days" do
    context "when authenticated" do
      before do
        post api_v1_sessions_path, params: { email: user.email, password: user.password }
        expect(response).to have_http_status(:ok)
      end

      it "sets shared_at for the day" do
        post api_v1_shared_days_path, params: { shared_day: { day_id: unshared_day.id } }
        expect(response).to have_http_status(:ok)
        expect(unshared_day.reload.shared_at).to be_present
      end

      it "returns not found when day belongs to another user" do
        post api_v1_shared_days_path, params: { shared_day: { day_id: other_user_day.id } }
        expect(response).to have_http_status(:not_found)
      end
    end

    context "when not authenticated" do
      it "returns unauthorized status" do
        post api_v1_shared_days_path, params: { shared_day: { day_id: unshared_day.id } }
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end

  describe "DELETE /api/v1/shared_days/:id" do
    context "when authenticated" do
      before do
        post api_v1_sessions_path, params: { email: user.email, password: user.password }
        expect(response).to have_http_status(:ok)
      end

      it "clears shared_at for the day" do
        delete api_v1_shared_day_path(day.id)
        expect(response).to have_http_status(:ok)
        expect(day.reload.shared_at).to be_nil
      end

      it "returns not found when day belongs to another user" do
        delete api_v1_shared_day_path(other_user_day.id)
        expect(response).to have_http_status(:not_found)
      end
    end

    context "when not authenticated" do
      it "returns unauthorized status" do
        delete api_v1_shared_day_path(day.id)
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end
end
