require 'rails_helper'

RSpec.describe PhotoUpdateService do
  let(:user) { create(:user) }
  let(:photo_import) { create(:photo_import, user: user) }
  let(:photo) { create(:photo, user: user, photo_import: photo_import) }
  let(:resort) { create(:resort) }
  let(:valid_params) { { taken_at: Time.current, resort_id: resort.id } }
  let(:invalid_params) { { taken_at: nil, resort_id: nil } }

  describe '#update_photo' do
    context 'with valid params' do
      it 'updates the photo with the provided params' do
        result = described_class.new(photo, valid_params).update_photo
        expect(result).to be_updated
        expect(result.photo.taken_at).to eq(valid_params[:taken_at])
        expect(result.photo.resort_id).to eq(valid_params[:resort_id])
      end

      it 'sets exif_state to extracted when taken_at and resort are present' do
        result = described_class.new(photo, valid_params).update_photo
        expect(result.photo.exif_state).to eq('extracted')
      end

      it 'calls AttachToDraftDayService when taken_at and resort are present' do
        expect_any_instance_of(AttachToDraftDayService).to receive(:attach_draft_day)
        described_class.new(photo, valid_params).update_photo
      end
    end

    context 'with invalid params' do
      it 'does update the photo' do
        result = described_class.new(photo, invalid_params).update_photo
        expect(result).to be_updated
        expect(result.photo.valid?).to be_truthy
      end

      it 'does not set exif_state to extracted' do
        result = described_class.new(photo, invalid_params).update_photo
        expect(result.photo.exif_state).not_to eq('extracted')
      end

      it 'does not call AttachToDraftDayService' do
        expect_any_instance_of(AttachToDraftDayService).not_to receive(:attach_draft_day)
        described_class.new(photo, invalid_params).update_photo
      end
    end
  end
end
