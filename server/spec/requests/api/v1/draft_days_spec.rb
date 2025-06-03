require 'rails_helper'

RSpec.describe "Api::V1::DraftDays", type: :request do
  let!(:user) { create(:user) }
  let!(:other_user) { create(:user) }
  let!(:photo_import) { create(:photo_import, user: user) }
  let!(:resort) { create(:resort) } # Needed by draft_day factory
  let!(:draft_day) { create(:draft_day, photo_import: photo_import, resort: resort, decision: "pending") }
  let!(:other_users_draft_day) { create(:draft_day, photo_import: create(:photo_import, user: other_user), resort: resort) }
  let(:day) { create(:day, user: user, resort: resort, date: draft_day.date) }

  describe "PATCH /api/v1/draft_days/:id" do
    context "when authenticated" do
      before do
        post api_v1_sessions_path, params: { email: user.email, password: user.password }
        expect(response).to have_http_status(:ok)
      end

      context "changing the decision" do
        let(:valid_params) { { draft_day: { decision: "skip" } } }

        it "updates the draft day's decision" do
          patch api_v1_draft_day_path(draft_day), params: { draft_day: { decision: "duplicate" } }
          draft_day.reload
          expect(draft_day.decision).to eq("duplicate")
        end

        it "returns ok status and the updated draft day" do
          patch api_v1_draft_day_path(draft_day), params: valid_params
          expect(response).to have_http_status(:ok)
          json_response = JSON.parse(response.body)
          expect(json_response['id']).to eq(draft_day.id)
          expect(json_response['decision']).to eq("skip")
        end

        context "when the decision is 'merge'" do
          context "when the day-association is not set" do
            it "returns unprocessable_entity status" do
              patch api_v1_draft_day_path(draft_day), params: { draft_day: { decision: "merge" } }
              expect(response).to have_http_status(:unprocessable_entity)
              json_response = JSON.parse(response.body)
              expect(json_response['errors']).to be_present
              expect(json_response['errors']['day']).to include("can't be blank")
            end
          end

          context "when the day-association IS set" do
            before do
              draft_day.update(day: day)
            end

            it "returns ok status" do
              patch api_v1_draft_day_path(draft_day), params: { draft_day: { decision: "merge" } }
              expect(response).to have_http_status(:ok)
              json_response = JSON.parse(response.body)
              draft_day.reload
              expect(draft_day.decision).to eq("merge")
            end
          end
        end
      end

      context "when the draft day does not exist" do
        it "returns not found status" do
          patch api_v1_draft_day_path("non_existent_id"), params: { draft_day: { decision: "skip" } }
          expect(response).to have_http_status(:not_found)
        end
      end

      context "when trying to update another user's draft day" do
        it "returns not found status" do
          patch api_v1_draft_day_path(other_users_draft_day), params: { draft_day: { decision: "skip" } }
          expect(response).to have_http_status(:not_found) # Due to current_user.draft_days.find
        end
      end
    end

    context "when not authenticated" do
      it "returns unauthorized status" do
        patch api_v1_draft_day_path(draft_day), params: { draft_day: { decision: "merge" } }
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end
end
