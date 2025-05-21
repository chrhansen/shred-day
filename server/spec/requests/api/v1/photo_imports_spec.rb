require 'rails_helper'

RSpec.describe "Api::V1::PhotoImports", type: :request do
  let!(:user) { create(:user) }
  let!(:other_user) { create(:user) }
  let!(:photo_import) { create(:photo_import, user: user) }
  # For testing include parameters
  let!(:resort) { create(:resort) }
  let!(:draft_day) { create(:draft_day, photo_import: photo_import, resort: resort) }
  let!(:root_photo) { create(:photo, photo_import: photo_import, user: user, resort: resort, image: fixture_file_upload('test_image.png', 'image/png')) }
  let!(:photo_on_draft_day) { create(:photo, photo_import: photo_import, draft_day: draft_day, day: nil, user: user, resort: resort, image: fixture_file_upload('test_image.jpg', 'image/jpeg')) }

  describe "POST /api/v1/photo_imports" do
    context "when authenticated" do
      before do
        post api_v1_session_path, params: { email: user.email, password: user.password }
        expect(response).to have_http_status(:ok)
      end

      it "creates a new PhotoImport for the current user" do
        expect {
          post api_v1_photo_imports_path
        }.to change(user.photo_imports, :count).by(1)
        expect(response).to have_http_status(:created)
      end

      it "returns the created photo_import with default status and includes" do
        post api_v1_photo_imports_path
        json_response = JSON.parse(response.body)

        expect(json_response['id']).to be_present
        expect(json_response['created_at']).to be_present
        expect(json_response['updated_at']).to be_present
        expect(json_response['status']).to eq('waiting')
        expect(json_response['draft_days']).to eq([])
        expect(json_response['photos']).to eq([])
      end
    end

    context "when not authenticated" do
      it "returns unauthorized status" do
        post api_v1_photo_imports_path
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end

  describe "GET /api/v1/photo_imports/:id" do
    context "when authenticated" do
      before do
        post api_v1_session_path, params: { email: user.email, password: user.password }
      end

      context "when the photo_import exists and belongs to the user" do
        it "returns the photo_import details with specified includes" do

          get api_v1_photo_import_path(photo_import)
          expect(response).to have_http_status(:ok)
          json_response = JSON.parse(response.body)

          expect(json_response['id']).to eq(photo_import.id)
          expect(json_response['status']).to eq(photo_import.status)

          expect(json_response['photos']).to be_an(Array)
          expect(json_response['photos'].size).to eq(2) # photo_on_draft_day and root_photo are included
          photo_ids = json_response['photos'].map { |photo| photo['id'] }
          expect(photo_ids.sort).to eq([root_photo.id, photo_on_draft_day.id].sort)
          expect(json_response['photos'][0]['resort']['id']).to eq(resort.id)

          expect(json_response['draft_days']).to be_an(Array)
          expect(json_response['draft_days'].size).to eq(1)
          expect(json_response['draft_days'][0]['id']).to eq(draft_day.id)
          expect(json_response['draft_days'][0]['resort']['id']).to eq(resort.id)
          expect(json_response['draft_days'][0]['photos']).to be_an(Array)
          expect(json_response['draft_days'][0]['photos'].size).to eq(1)
          expect(json_response['draft_days'][0]['photos'][0]['id']).to eq(photo_on_draft_day.id)
          expect(json_response['draft_days'][0]['photos'][0]['resort']['id']).to eq(resort.id)
        end
      end

      context "when the photo_import does not exist" do
        it "returns not found status" do
          get api_v1_photo_import_path("non_existent_id")
          expect(response).to have_http_status(:not_found)
        end
      end

      context "when the photo_import belongs to another user" do
        let(:other_photo_import) { create(:photo_import, user: other_user) }
        it "returns not found status" do
          get api_v1_photo_import_path(other_photo_import)
          expect(response).to have_http_status(:not_found)
        end
      end
    end

    context "when not authenticated" do
      it "returns unauthorized status" do
        get api_v1_photo_import_path(photo_import)
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end

  describe "PATCH /api/v1/photo_imports/:id" do
    context "when authenticated" do
      before do
        post api_v1_session_path, params: { email: user.email, password: user.password }
      end

      context "with valid parameters to trigger processing/commit (e.g., changing status)" do
        let(:update_params) { { photo_import: { status: "committed" } } }

        it "updates the photo_import status and triggers service" do
          # Mock or expect the service to be called if testing that interaction directly,
          # otherwise, test the outcome (status change, response).
          photo_import.status_waiting! # Ensure it's in a state the service can act upon

          # Stub the service to control its outcome for this controller test
          update_service_result = instance_double(PhotoImportUpdateService::Result, updated?: true, error: nil)
          allow_any_instance_of(PhotoImportUpdateService).to receive(:update_photo_import).and_return(update_service_result)
          allow(photo_import).to receive(:reload).and_return(photo_import) # Stub reload if service modifies and controller reloads

          patch api_v1_photo_import_path(photo_import), params: update_params
          expect(response).to have_http_status(:ok)

          json_response = JSON.parse(response.body)
          # We check the status passed in params because service is stubbed.
          # In a full integration test for the service, you'd check the actual final status.
          expect(json_response['status']).to eq("waiting")
        end
      end

      context "when PhotoImportUpdateService returns an error" do
        let(:update_params) { { photo_import: { status: "committed" } } }
        it "returns unprocessable_entity" do
          photo_import.status_waiting!
          update_service_result = instance_double(PhotoImportUpdateService::Result, updated?: false, error: "Service failed")
          allow_any_instance_of(PhotoImportUpdateService).to receive(:update_photo_import).and_return(update_service_result)

          patch api_v1_photo_import_path(photo_import), params: update_params
          expect(response).to have_http_status(:unprocessable_entity)
          expect(JSON.parse(response.body)['error']).to eq("Service failed")
        end
      end
    end
    # ... (add not authenticated, other user's import, etc.)
  end

  describe "DELETE /api/v1/photo_imports/:id" do
    context "when authenticated" do
      before do
        post api_v1_session_path, params: { email: user.email, password: user.password }
      end

      it "deletes the photo_import and associated records" do
        # photo_import, draft_day, photo_on_draft_day, root_photo are created in let! blocks
        expect(PhotoImport.count).to eq(1) # Initial photo_import for the test
        expect(DraftDay.count).to eq(1)
        expect(Photo.count).to eq(2) # photo_on_draft_day + root_photo

        expect {
          delete api_v1_photo_import_path(photo_import)
        }.to change(PhotoImport, :count).by(-1)
         .and change(DraftDay, :count).by(-1)
         .and change(Photo, :count).by(-2)

        expect(response).to have_http_status(:no_content)
      end

      it "does not delete another user's photo_import" do
        other_pi = create(:photo_import, user: other_user)
        expect {
          delete api_v1_photo_import_path(other_pi)
        }.to_not change(PhotoImport, :count)
        expect(response).to have_http_status(:not_found) # Controller uses current_user.photo_imports.find
      end
    end

    context "when not authenticated" do
      it "returns unauthorized" do
        delete api_v1_photo_import_path(photo_import)
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end
end
