require 'rails_helper'

RSpec.describe PhotoCreateService do
  let(:user) { create(:user) }
  let(:photo_import) { create(:photo_import, user: user) }
  let(:file) { fixture_file_upload(Rails.root.join('spec/fixtures/files/test_image.jpg'), 'image/jpeg') }
  let(:photo_params) { { file: file } }

  before do
    ActiveJob::Base.queue_adapter = :test
  end

  describe '#create_photo' do
    subject(:result) { described_class.new(photo_import, photo_params).create_photo }

    context 'with valid params' do
      it 'creates a photo associated with the photo_import and user' do
        expect { result }.to change { photo_import.photos.count }.by(1)
        photo = result.photo
        expect(photo.user).to eq(user)
        expect(photo.photo_import).to eq(photo_import)
      end

      it 'attaches the uploaded file to the photo' do
        photo = result.photo
        expect(photo.image).to be_attached
      end

      it 'enqueues ExtractExifAndSetNearestResortJob with the photo id' do
        expect {
          described_class.new(photo_import, photo_params).create_photo
        }.to have_enqueued_job(ExtractExifAndSetNearestResortJob).with(kind_of(String))
      end

      it 'returns a result object with created? true and the photo' do
        expect(result).to be_created
        expect(result.photo).to be_a(Photo)
      end
    end

    context 'when the photo is invalid' do
      let(:photo_params) { { file: nil } }

      it 'does not create a photo' do
        expect { result }.not_to change { Photo.count }
      end

      it 'does not enqueue the job' do
        expect {
          described_class.new(photo_import, photo_params).create_photo
        }.not_to have_enqueued_job(ExtractExifAndSetNearestResortJob)
      end

      it 'returns a result object with created? false and the unsaved photo' do
        expect(result).not_to be_created
        expect(result.photo).to be_a(Photo)
        expect(result.photo).not_to be_persisted
      end
    end
  end
end
