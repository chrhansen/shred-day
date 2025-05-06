require 'rails_helper'

RSpec.describe "Api::V1::Photos", type: :request do
  let!(:user) { create(:user) }
  let!(:other_user) { create(:user) }

  describe "POST /api/v1/photos" do
    let(:valid_photo_file) { fixture_file_upload(Rails.root.join('spec', 'fixtures', 'files', 'test_image.jpg'), 'image/jpeg') }
    let(:valid_params) { { file: valid_photo_file } }

    context "when authenticated" do
      before do
        # Log in the user
        post api_v1_session_path, params: { email: user.email, password: user.password }
        expect(response).to have_http_status(:ok)
      end

      context "with a valid file" do
        it "creates a new Photo record" do
          expect {
            post api_v1_photos_path, params: valid_params
          }.to change(Photo, :count).by(1)
           .and change(ActiveStorage::Attachment, :count).by(3) # 1 for the image, 2 for the variants
        end

        it "associates the photo with the current user" do
          post api_v1_photos_path, params: valid_params
          expect(Photo.last.user).to eq(user)
        end

        it "returns status created and photo info" do
          post api_v1_photos_path, params: valid_params
          expect(response).to have_http_status(:created)
          json_response = JSON.parse(response.body)
          expect(json_response['id']).to be_present
          expect(json_response['filename']).to eq('test_image.jpg')
          expect(json_response['preview_url']).to include('test_image.jpg')
          expect(json_response['full_url']).to include('test_image.jpg')
        end
      end

      context "without a file" do
        let(:invalid_params) { { file: nil } }

        it "does not create a Photo record" do
          expect {
            post api_v1_photos_path, params: invalid_params
          }.to_not change(Photo, :count)
        end

        it "returns status unprocessable_entity and error message" do
          post api_v1_photos_path, params: invalid_params
          expect(response).to have_http_status(:unprocessable_entity)
          json_response = JSON.parse(response.body)
          expect(json_response['errors']).to include("No file provided.")
        end
      end
    end

    context "when not authenticated" do
      it "does not create a photo" do
         expect {
           post api_v1_photos_path, params: valid_params
         }.to_not change(Photo, :count)
      end
      it "returns status unauthorized" do
        post api_v1_photos_path, params: valid_params
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end

  describe "DELETE /api/v1/photos/:id" do
    let!(:photo_to_delete) { create(:photo, user: user, image: fixture_file_upload(Rails.root.join('spec', 'fixtures', 'files', 'test_image.jpg'), 'image/jpeg')) }
    let!(:other_photo) { create(:photo, user: other_user, image: fixture_file_upload(Rails.root.join('spec', 'fixtures', 'files', 'test_image.png'), 'image/png')) }

    context "when authenticated" do
      before do
        # Log in the user
        post api_v1_session_path, params: { email: user.email, password: user.password }
        expect(response).to have_http_status(:ok)
      end

      context "when the photo exists and belongs to the user" do
        it "deletes the Photo record and its attachment" do
          expect {
            delete api_v1_photo_path(photo_to_delete)
          }.to change(Photo, :count).by(-1)
           .and change(ActiveStorage::Attachment, :count).by(-3) # 1 for the image, 2 for the variants
        end

        it "returns status no_content" do
          delete api_v1_photo_path(photo_to_delete)
          expect(response).to have_http_status(:no_content)
        end
      end

      context "when the photo exists but belongs to another user" do
        it "does not delete the photo" do
          expect {
            delete api_v1_photo_path(other_photo)
          }.to_not change(Photo, :count)
        end

        it "returns status not_found" do
          delete api_v1_photo_path(other_photo)
          expect(response).to have_http_status(:not_found)
        end
      end

      context "when the photo does not exist" do
        it "returns status not_found" do
          delete api_v1_photo_path("non_existent_id")
          expect(response).to have_http_status(:not_found)
        end
      end
    end

    context "when not authenticated" do
      it "does not delete the photo" do
        expect {
          delete api_v1_photo_path(photo_to_delete)
        }.to_not change(Photo, :count)
      end
      it "returns status unauthorized" do
        delete api_v1_photo_path(photo_to_delete)
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end
end
