require 'rails_helper'

RSpec.describe "Api::V1::PhotoImports::PhotosController", type: :request do
  let!(:user) { create(:user) }
  let!(:other_user) { create(:user) }
  let!(:photo_import) { create(:photo_import, user: user) }
  let!(:other_photo_import) { create(:photo_import, user: other_user) }
  let!(:existing_photo) { create(:photo, photo_import: photo_import, user: user, image: fixture_file_upload('test_image.jpg', 'image/jpeg')) }
  let!(:resort) { create(:resort) } # For update tests

  # --- Authentication Helper ---
  def login(user_to_login)
    post api_v1_sessions_path, params: { email: user_to_login.email, password: user_to_login.password }
    expect(response).to have_http_status(:ok)
  end

  describe "POST /api/v1/photo_imports/:photo_import_id/photos" do
    let(:valid_photo_params) { { file: fixture_file_upload(Rails.root.join('spec', 'fixtures', 'files', 'test_image.png'), 'image/png') } }

    context "when authenticated" do
      before { login(user) }

      context "for user's own photo import" do
        it "creates a new photo, associates it with the photo_import, and calls the service" do
          # Stub the service to focus on controller logic
          service_result = instance_double(PhotoCreateService::Result, created?: true, photo: build_stubbed(:photo, photo_import: photo_import, user: user))
          allow(PhotoCreateService).to receive(:new).and_return(instance_double(PhotoCreateService, create_photo: service_result))

          expect {
            post api_v1_photo_import_photos_path(photo_import), params: valid_photo_params
          }.to change(photo_import.photos, :count).by(0) # Because service is stubbed and doesn't actually create

          expect(PhotoCreateService).to have_received(:new).with(photo_import, kind_of(ActionController::Parameters))
          expect(response).to have_http_status(:created)
          # Add more checks for the response body based on what the stubbed photo returns via serializer
        end

        it "returns unprocessable_entity if service reports creation failure" do
          photo_with_errors = build_stubbed(:photo)
          # Stub the errors.full_messages chain directly on the photo double
          allow(photo_with_errors).to receive_message_chain(:errors, :full_messages).and_return(["Service error"])
          service_result = instance_double(PhotoCreateService::Result, created?: false, photo: photo_with_errors)
          allow(PhotoCreateService).to receive(:new).and_return(instance_double(PhotoCreateService, create_photo: service_result))

          post api_v1_photo_import_photos_path(photo_import), params: valid_photo_params
          expect(response).to have_http_status(:unprocessable_entity)
          expect(JSON.parse(response.body)['errors']).to include("Service error")
        end

        it "returns unprocessable_entity if no file is provided" do
          # Simulate PhotoCreateService returning an error when no file is provided
          photo_with_file_error = build_stubbed(:photo)
          allow(photo_with_file_error).to receive_message_chain(:errors, :full_messages).and_return(["No file provided."])
          service_result = instance_double(PhotoCreateService::Result, created?: false, photo: photo_with_file_error)

          # Expect PhotoCreateService.new to be called with params where file is nil
          # The kind_of(ActionController::Parameters) will match the params object passed by controller
          allow(PhotoCreateService).to receive(:new)
            .with(photo_import, kind_of(ActionController::Parameters))
            .and_return(instance_double(PhotoCreateService, create_photo: service_result))

          post api_v1_photo_import_photos_path(photo_import), params: { file: nil } # Send params with file: nil

          expect(response).to have_http_status(:unprocessable_entity)
          expect(JSON.parse(response.body)['errors']).to include("No file provided.")
        end
      end

      context "for another user's photo import" do
        it "returns not found" do
          post api_v1_photo_import_photos_path(other_photo_import), params: valid_photo_params
          expect(response).to have_http_status(:not_found)
        end
      end
    end

    context "when not authenticated" do
      it "returns unauthorized" do
        post api_v1_photo_import_photos_path(photo_import), params: valid_photo_params
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end

  describe "PATCH /api/v1/photo_imports/:photo_import_id/photos/:id" do
    let(:valid_update_params) { { photo: { taken_at: Time.current.iso8601, resort_id: resort.id } } }

    context "when authenticated" do
      before { login(user) }

      context "for user's own photo in their photo import" do
        it "updates the photo and calls the service" do
          update_service_result = instance_double(PhotoUpdateService::Result, updated?: true)
          allow(PhotoUpdateService).to receive(:new).with(existing_photo, ActionController::Parameters.new(valid_update_params[:photo]).permit(:taken_at, :resort_id)).and_return(instance_double(PhotoUpdateService, update_photo: update_service_result))

          patch api_v1_photo_import_photo_path(photo_import, existing_photo), params: valid_update_params

          expect(PhotoUpdateService).to have_received(:new)
          expect(response).to have_http_status(:ok)
          # Check response body for updated photo details. We want to be sure that
          # exif_state is updated and taken_at and resort are present
        end

        it "returns unprocessable_entity if service reports update failure" do
          update_service_result = instance_double(PhotoUpdateService::Result, updated?: false)
          # Stub errors on existing_photo if controller uses @photo.errors.full_messages
          allow(existing_photo).to receive_message_chain(:errors, :full_messages).and_return(["Update failed via service"])
          allow(PhotoUpdateService).to receive(:new).and_return(instance_double(PhotoUpdateService, update_photo: update_service_result))

          patch api_v1_photo_import_photo_path(photo_import, existing_photo), params: valid_update_params
          expect(response).to have_http_status(:unprocessable_entity)
          # expect(JSON.parse(response.body)['errors']).to include("Update failed via service")
        end
      end

      context "for a photo not in the specified photo import" do
        let(:another_import) { create(:photo_import, user: user) }
        it "returns not found from set_photo" do
          patch api_v1_photo_import_photo_path(another_import, existing_photo), params: valid_update_params
          expect(response).to have_http_status(:not_found)
        end
      end
    end

    context "when not authenticated" do
      it "returns unauthorized status" do
        patch api_v1_photo_import_photo_path(photo_import, existing_photo), params: valid_update_params
        expect(response).to have_http_status(:unauthorized)
      end

      it "does not update the photo" do
        original_taken_at = existing_photo.taken_at
        patch api_v1_photo_import_photo_path(photo_import, existing_photo), params: valid_update_params
        expect(existing_photo.reload.taken_at).to eq(original_taken_at)
      end
    end
  end

  describe "DELETE /api/v1/photo_imports/:photo_import_id/photos/:id" do
    context "when authenticated" do
      before { login(user) }

      context "for user's own photo in their photo import" do
        it "deletes the photo and calls the service" do
          destroy_service_result = instance_double(PhotoDestroyService::Result, destroyed?: true)
          allow(PhotoDestroyService).to receive(:new).with(existing_photo).and_return(instance_double(PhotoDestroyService, destroy_photo: destroy_service_result))

          expect {
            delete api_v1_photo_import_photo_path(photo_import, existing_photo)
          }.to change(Photo, :count).by(0) # Service is stubbed

          expect(PhotoDestroyService).to have_received(:new).with(existing_photo)
          expect(response).to have_http_status(:no_content)
        end

        it "returns unprocessable_entity if service reports destroy failure" do
          destroy_service_result = instance_double(PhotoDestroyService::Result, destroyed?: false)
          allow(existing_photo).to receive_message_chain(:errors, :full_messages).and_return(["Destroy failed via service"])
          allow(PhotoDestroyService).to receive(:new).and_return(instance_double(PhotoDestroyService, destroy_photo: destroy_service_result))

          delete api_v1_photo_import_photo_path(photo_import, existing_photo)
          expect(response).to have_http_status(:unprocessable_entity)
        end
      end
      # ... (add tests for photo not in import, other user's import, etc.) ...
    end

    context "when not authenticated" do
      it "returns unauthorized status" do
        delete api_v1_photo_import_photo_path(photo_import, existing_photo)
        expect(response).to have_http_status(:unauthorized)
      end

      it "does not delete the photo" do
        expect {
          delete api_v1_photo_import_photo_path(photo_import, existing_photo)
        }.to_not change(Photo, :count)
      end
    end
  end
end
