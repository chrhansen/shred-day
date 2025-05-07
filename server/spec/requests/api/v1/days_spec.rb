# spec/requests/api/v1/days_spec.rb
require 'rails_helper'

RSpec.describe "Api::V1::Days", type: :request do
  let!(:user) { create(:user) }
  let!(:other_user) { create(:user) } # For authorization tests
  let!(:resort) { create(:resort) }
  let!(:ski) { create(:ski, user: user) }
  let!(:other_ski) { create(:ski, user: user) } # For update tests
  let!(:day) { create(:day, user: user, resort: resort, ski: ski, notes: "This is just a test", activity: "Friends", date: Date.yesterday) } # Create a day for show/update
  let!(:other_day) { create(:day, user: other_user, resort: resort, ski: ski) } # Day belonging to another user
  let!(:resort_b) { create(:resort) } # For variety
  let(:target_date) { Date.today } # A specific date for testing limits
  let!(:photo1_for_day) { create(:photo, day: day, image: fixture_file_upload(Rails.root.join('spec', 'fixtures', 'files', 'test_image.jpg'), 'image/jpeg')) }

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
              ski_id: ski.id,
              notes: "This is a test note"
            }
          }
        end

        it "creates a new day log for the user" do
          expect {
            post api_v1_days_path, params: valid_params
          }.to change(user.days, :count).by(1)
        end

        it "returns created status and the created day info (using DaySerializer)" do
          post api_v1_days_path, params: valid_params
          expect(response).to have_http_status(:created)
          json_response = JSON.parse(response.body)

          # Check standard fields
          expect(json_response['id']).to be_present
          expect(json_response['date']).to eq(Date.today.to_s)
          expect(json_response['user_id']).to eq(user.id)
          expect(json_response['notes']).to eq("This is a test note")
          # Check for nested objects
          expect(json_response).to have_key('resort')
          expect(json_response['resort']).to include('id' => resort.id, 'name' => resort.name)
          expect(json_response).to have_key('ski')
          expect(json_response['ski']).to include('id' => ski.id, 'name' => ski.name)
          # Check absence of flattened names
          expect(json_response).not_to have_key('has_notes')
          expect(json_response).not_to have_key('resort_name')
          expect(json_response).not_to have_key('ski_name')
          expect(json_response['photos']).to eq([]) # Expect empty photos array if none uploaded
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

      context "when the user already has 3 entries for that date" do
        before do
          # Create 3 existing days for the target date
          3.times do |i|
            create(:day, user: user, date: target_date, resort: resort, ski: ski, activity: "Activity #{i}")
          end
        end

        let(:fourth_day_params) do
          {
            day: {
              date: target_date.to_s,
              resort_id: resort_b.id, # Different resort, same date
              ski_id: ski.id,
              activity: "Fourth Entry"
            }
          }
        end

        it "does not create a new day log" do
          expect {
            post api_v1_days_path, params: fourth_day_params
          }.to_not change(Day, :count)
        end

        it "returns unprocessable_entity status and the specific base error" do
          post api_v1_days_path, params: fourth_day_params
          expect(response).to have_http_status(:unprocessable_entity)
          json_response = JSON.parse(response.body)
          expect(json_response['errors']['base']).to include("cannot log more than 3 entries for the same date")
        end
      end

      # --- Test photo upload --- #
      context "with valid parameters including photos" do
        # Remove photo file fixtures from params definition
        # let(:photo1) { fixture_file_upload(Rails.root.join('spec', 'fixtures', 'files', 'test_image.jpg'), 'image/jpeg') }
        # let(:photo2) { fixture_file_upload(Rails.root.join('spec', 'fixtures', 'files', 'test_image.png'), 'image/png') }

        # Define base valid params without photos here
        let(:base_valid_params) do
          {
            day: {
              date: Date.today.to_s,
              resort_id: resort.id,
              ski_id: ski.id,
              activity: 'Photo Day'
            }
          }
        end

        # Pre-create photos before the request
        let!(:pre_created_photo1) { create(:photo, user: user, image: fixture_file_upload(Rails.root.join('spec', 'fixtures', 'files', 'test_image.jpg'), 'image/jpeg')) }
        let!(:pre_created_photo2) { create(:photo, user: user, image: fixture_file_upload(Rails.root.join('spec', 'fixtures', 'files', 'test_image.png'), 'image/png')) }
        let(:photo_ids) { [pre_created_photo1.id, pre_created_photo2.id] }

        # Update params to include photo_ids
        let(:params_with_photo_ids) { base_valid_params.deep_merge(day: { photo_ids: photo_ids }) }

        it "creates a new day log and associates the pre-created photos" do
          expect(pre_created_photo1.day_id).to be_nil
          expect(pre_created_photo2.day_id).to be_nil

          # Only check for Day count change
          expect {
            post api_v1_days_path, params: params_with_photo_ids
          }.to change(user.days, :count).by(1)

          # Check that the pre-created photos are now associated
          expect(pre_created_photo1.reload.day_id).not_to be_nil
          expect(pre_created_photo2.reload.day_id).not_to be_nil
          created_day = Day.find(JSON.parse(response.body)['id'])
          expect(pre_created_photo1.day).to eq(created_day)
          expect(pre_created_photo2.day).to eq(created_day)
          expect(created_day.photos.count).to eq(2)
        end

        it "returns created status and the day info including associated photo URLs" do
          post api_v1_days_path, params: params_with_photo_ids
          expect(response).to have_http_status(:created)
          json_response = JSON.parse(response.body)

          expect(json_response['id']).to be_present
          expect(json_response['photos']).to be_an(Array)
          expect(json_response['photos'].count).to eq(2)

          # Check structure of photo objects in response (IDs should match pre-created)
          expect(json_response['photos'][0]['id']).to eq(pre_created_photo1.id)
          expect(json_response['photos'][0]).to include('filename', 'preview_url', 'full_url')
          expect(json_response['photos'][0]['filename']).to eq('test_image.jpg')
          expect(json_response['photos'][0]['preview_url']).to include('test_image.jpg')
          expect(json_response['photos'][0]['full_url']).to include('test_image.jpg')

          expect(json_response['photos'][1]['id']).to eq(pre_created_photo2.id)
          expect(json_response['photos'][1]).to include('filename', 'preview_url', 'full_url')
          expect(json_response['photos'][1]['filename']).to eq('test_image.png')
          expect(json_response['photos'][1]['preview_url']).to include('test_image.png')
          expect(json_response['photos'][1]['full_url']).to include('test_image.png')
        end
      end
      # --- End test photo upload ---

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

  # --- GET /api/v1/days/:id (show) ---
  describe "GET /api/v1/days/:id" do
    context "when authenticated" do
      before do
        post api_v1_session_path, params: { email: user.email, password: user.password }
        expect(response).to have_http_status(:ok)
      end

      context "when the day exists and belongs to the user" do
        it "returns the day details including associations (using DaySerializer)" do
          get api_v1_day_path(day)
          expect(response).to have_http_status(:ok)
          json_response = JSON.parse(response.body)

          # Check standard fields
          expect(json_response['id']).to eq(day.id)
          expect(json_response['date']).to eq(day.date.to_s)
          expect(json_response['activity']).to eq("Friends")
          expect(json_response['notes']).to eq("This is just a test")
          # Check for nested objects
          expect(json_response).to have_key('resort')
          expect(json_response['resort']).to include('id' => resort.id, 'name' => resort.name)
          expect(json_response).to have_key('ski')
          expect(json_response['ski']).to include('id' => ski.id, 'name' => ski.name)
          # Check absence of flattened names
          expect(json_response).not_to have_key('has_notes')
          expect(json_response).not_to have_key('resort_name')
          expect(json_response).not_to have_key('ski_name')

          # Check for photos using PhotoSerializer format
          expect(json_response['photos']).to be_an(Array)
          expect(json_response['photos'].count).to eq(1)
          photo_json = json_response['photos'][0]
          expect(photo_json['id']).to eq(photo1_for_day.id)
          expect(photo_json['filename']).to eq('test_image.jpg')
          expect(photo_json['preview_url']).to include('test_image.jpg')
          expect(photo_json['full_url']).to include('test_image.jpg')
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
              ski_id: other_ski.id, # Change ski
              notes: "This is an updated test note" # Change notes
            }
          }
        end

        it "updates the day log" do
          patch api_v1_day_path(day), params: valid_update_params
          day.reload # Reload from DB
          expect(day.activity).to eq("Training")
          expect(day.ski_id).to eq(other_ski.id)
        end

        it "returns ok status and the updated day info (using DaySerializer)" do
          patch api_v1_day_path(day), params: valid_update_params
          expect(response).to have_http_status(:ok)
          json_response = JSON.parse(response.body)

          # Check standard fields
          expect(json_response['id']).to eq(day.id)
          expect(json_response['activity']).to eq("Training")
          expect(json_response['notes']).to eq("This is an updated test note")

          # Check for nested objects
          expect(json_response).to have_key('resort')
          expect(json_response['resort']['id']).to eq(resort.id) # Resort wasn't changed
          expect(json_response).to have_key('ski')
          expect(json_response['ski']['id']).to eq(other_ski.id) # Check updated ski nested object
          expect(json_response['ski']['name']).to eq(other_ski.name)
          # Check absence of flattened names
          expect(json_response).not_to have_key('has_notes')
          expect(json_response).not_to have_key('resort_name')
          expect(json_response).not_to have_key('ski_name')

          # Check for photos using PhotoSerializer format
          expect(json_response['photos']).to be_an(Array)
          expect(json_response['photos'].count).to eq(1)
          photo_json = json_response['photos'][0]
          expect(photo_json['id']).to eq(photo1_for_day.id)
          expect(photo_json['filename']).to eq('test_image.jpg')
          expect(photo_json['preview_url']).to include('test_image.jpg')
          expect(photo_json['full_url']).to include('test_image.jpg')
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

      context "when trying to update to a date that already has 3 entries" do
        let!(:date_a) { Date.today }
        let!(:date_b) { Date.today + 1.day }
        let!(:day_on_date_b) { create(:day, user: user, date: date_b, resort: resort, ski: ski) }

        before do
          # Create 3 existing days for date_a
          3.times do |i|
            create(:day, user: user, date: date_a, resort: resort, ski: ski, activity: "Activity A#{i}")
          end
        end

        let(:update_to_full_date_params) do
          { day: { date: date_a.to_s } } # Try to change date to date_a
        end

        it "does not update the day log" do
          expect {
            patch api_v1_day_path(day_on_date_b), params: update_to_full_date_params
          }.not_to change { day_on_date_b.reload.date }
        end

        it "returns unprocessable_entity status and the specific base error" do
          patch api_v1_day_path(day_on_date_b), params: update_to_full_date_params
          expect(response).to have_http_status(:unprocessable_entity)
          json_response = JSON.parse(response.body)
          expect(json_response['errors']['base']).to include("cannot log more than 3 entries for the same date")
        end
      end

      context "when updating an existing day on a date with 3 entries (no date change)" do
        let!(:date_full) { Date.today }
        let!(:day1) { create(:day, user: user, date: date_full, resort: resort, ski: ski, activity: "Act 1") }
        let!(:day2) { create(:day, user: user, date: date_full, resort: resort, ski: other_ski, activity: "Act 2") }
        let!(:day3) { create(:day, user: user, date: date_full, resort: resort_b, ski: ski, activity: "Act 3") }

        let(:update_params_no_date_change) do
          { day: { activity: "Updated Act 2" } } # Only change activity
        end

        it "allows the update" do
          patch api_v1_day_path(day2), params: update_params_no_date_change
          expect(response).to have_http_status(:ok)
          expect(day2.reload.activity).to eq("Updated Act 2")
        end
      end

      # --- Add context for testing photo updates --- #
      context "when updating photos" do
        let!(:day_to_update) { create(:day, user: user, resort: resort, ski: ski) }
        let!(:initial_photo) { create(:photo, user: user, day: day_to_update, image: fixture_file_upload('spec/fixtures/files/test_image.jpg', 'image/jpeg')) }
        let!(:photo_to_add1) { create(:photo, user: user, image: fixture_file_upload('spec/fixtures/files/test_image.heic', 'image/heic')) }
        let!(:photo_to_add2) { create(:photo, user: user, image: fixture_file_upload('spec/fixtures/files/test_image.jpg', 'image/jpeg')) }
        let!(:unrelated_photo) { create(:photo, user: user) } # Should not be affected

        let(:update_params_with_photos) do
          {
            day: {
              # We only need photo_ids for this test context
              photo_ids: [photo_to_add1.id, photo_to_add2.id]
              # This implies initial_photo should be removed/destroyed
            }
          }
        end

        it "synchronizes associated photos, removing old and adding new" do
          # Expect the initial photo to be destroyed
          expect {
            patch api_v1_day_path(day_to_update), params: update_params_with_photos
          }.to change(Photo, :count).by(-1)

          expect(response).to have_http_status(:ok)
          day_to_update.reload

          expect(day_to_update.photos.count).to eq(2)
          expect(day_to_update.photos).to include(photo_to_add1, photo_to_add2)
          expect(day_to_update.photos).not_to include(initial_photo)
          expect(Photo.exists?(initial_photo.id)).to be_falsey # Verify destruction
          expect(unrelated_photo.reload.day_id).to be_nil # Verify unrelated photo is untouched
        end

        it "removes all photos if photo_ids is an empty array" do
          expect {
            patch api_v1_day_path(day_to_update), params: { day: { photo_ids: [] } }
          }.to change(Photo, :count).by(-1)

          expect(response).to have_http_status(:ok)
          day_to_update.reload
          expect(day_to_update.photos.count).to eq(0)
          expect(Photo.exists?(initial_photo.id)).to be_falsey
        end

        it "does not change photos if photo_ids parameter is not provided" do
          # Expect no photos to be destroyed
          expect {
            patch api_v1_day_path(day_to_update), params: { day: { activity: "New Activity" } } # No photo_ids key
          }.to_not change(Photo, :count)

          expect(response).to have_http_status(:ok)
          day_to_update.reload
          expect(day_to_update.photos.count).to eq(1)
          expect(day_to_update.photos).to include(initial_photo)
        end
      end
      # --- End context for photo updates --- #

    end

    context "when not authenticated" do
      it "returns unauthorized status" do
        patch api_v1_day_path(day), params: { day: { activity: "Test" } }
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end

  # --- Add specs for GET /api/v1/days (index) ---
  describe "GET /api/v1/days" do
    context "when authenticated" do
      before do
        # Ensure the 'day' exists for the list
        day
        post api_v1_session_path, params: { email: user.email, password: user.password }
        expect(response).to have_http_status(:ok)
        get api_v1_days_path
      end

      it "returns ok status" do
        expect(response).to have_http_status(:ok)
      end

      it "returns a list of days with correct structure (using DayEntrySerializer)" do
        json_response = JSON.parse(response.body)
        expect(json_response).to be_an(Array)
        expect(json_response.size).to eq(1)
        day_entry = json_response.first

        expect(day_entry['id']).to eq(day.id)
        expect(day_entry).to have_key('date')
        expect(day_entry).to have_key('activity')
        expect(day_entry).to have_key('has_notes')

        # Check for flattened names
        expect(day_entry).to have_key('resort_name')
        expect(day_entry['resort_name']).to eq(resort.name)
        expect(day_entry).to have_key('ski_name')
        expect(day_entry['ski_name']).to eq(ski.name)
        expect(day_entry['has_notes']).to eq(true)

        # Check absence of nested objects
        expect(day_entry).not_to have_key('resort')
        expect(day_entry).not_to have_key('ski')
        expect(day_entry).not_to have_key('resort_id') # Should not be included by DayEntrySerializer
        expect(day_entry).not_to have_key('ski_id')    # Should not be included by DayEntrySerializer

        # Check for photos using PhotoSerializer format
        expect(day_entry['photos']).to be_an(Array)
        expect(day_entry['photos'].count).to eq(1)
        photo_json = day_entry['photos'][0]
        expect(photo_json['id']).to eq(photo1_for_day.id)
        expect(photo_json['filename']).to eq('test_image.jpg')
        expect(photo_json['preview_url']).to include('test_image.jpg')
        expect(photo_json['full_url']).to include('test_image.jpg')
      end
    end

    context "when not authenticated" do
      it "returns unauthorized status" do
        get api_v1_days_path
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end

  describe "DELETE /api/v1/days/:id" do
    context "when authenticated" do
      before do
        post api_v1_session_path, params: { email: user.email, password: user.password }
        expect(response).to have_http_status(:ok)
        # Ensure the day exists before trying to delete
        day
      end

      context "when the day exists and belongs to the user" do
        it "deletes the day log" do
          expect {
            delete api_v1_day_path(day)
          }.to change(user.days, :count).by(-1)
        end

        it "returns no_content status" do
          delete api_v1_day_path(day)
          expect(response).to have_http_status(:no_content)
        end
      end

      context "when the day does not exist" do
        it "returns not found status" do
          delete api_v1_day_path("non_existent_id")
          expect(response).to have_http_status(:not_found)
        end
      end

      context "when the day belongs to another user" do
        it "does not delete the day" do
           expect {
             delete api_v1_day_path(other_day)
           }.not_to change(Day, :count)
        end
        it "returns not found status" do
          delete api_v1_day_path(other_day)
          expect(response).to have_http_status(:not_found)
        end
      end
    end

    context "when not authenticated" do
      it "does not delete the day" do
        expect {
          delete api_v1_day_path(day)
        }.not_to change(Day, :count)
      end
      it "returns unauthorized status" do
        delete api_v1_day_path(day)
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end
end
