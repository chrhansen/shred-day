require 'rails_helper'

RSpec.describe PhotoDestroyService do
  let(:user) { create(:user) }
  let(:photo_import) { create(:photo_import, user: user) }
  let(:draft_day) { create(:draft_day, photo_import: photo_import) }

  describe '#destroy_photo' do
    context 'when the photo is the only one in its draft day' do
      let!(:photo) { create(:photo, user: user, photo_import: photo_import, draft_day: draft_day) }

      it 'destroys the photo and the draft day' do
        expect { described_class.new(photo).destroy_photo }
          .to change { Photo.exists?(photo.id) }.from(true).to(false)
          .and change { DraftDay.exists?(draft_day.id) }.from(true).to(false)
      end

      it 'returns a result object with destroyed? true and the photo' do
        result = described_class.new(photo).destroy_photo
        expect(result).to be_destroyed
        expect(result.photo).to eq(photo)
      end
    end

    context 'when the draft day has multiple photos' do
      let!(:photo1) { create(:photo, user: user, photo_import: photo_import, draft_day: draft_day) }
      let!(:photo2) { create(:photo, user: user, photo_import: photo_import, draft_day: draft_day) }

      it 'destroys only the photo, not the draft day' do
        expect { described_class.new(photo1).destroy_photo }
          .to change { Photo.exists?(photo1.id) }.from(true).to(false)
          .and not_change { DraftDay.exists?(draft_day.id) }
      end

      it 'returns a result object with destroyed? true and the photo' do
        result = described_class.new(photo1).destroy_photo
        expect(result).to be_destroyed
        expect(result.photo).to eq(photo1)
      end
    end
  end
end
