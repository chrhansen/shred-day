require 'rails_helper'

RSpec.describe SetNearestResortService do
  let(:user) { create(:user) }
  let(:photo_import) { create(:photo_import, user: user) }
  let(:photo) { create(:photo, user: user, photo_import: photo_import) }

  describe '#set_nearest_resort' do
    let!(:nearest_resort) { create(:resort, latitude: 40.7128, longitude: -74.0060) }
    let!(:second_nearest_resort) { create(:resort, latitude: 41.0000, longitude: -75.0000) }
    let!(:far_away_resort) { create(:resort, latitude: -45.0000, longitude: -170.0000) }

    context 'when the photo has latitude and longitude' do
      before do
        photo.update(latitude: 40.71, longitude: -74.00)
      end

      it 'finds the nearest resort and updates the photo' do
        result = described_class.new(photo).set_nearest_resort
        expect(result).to be_found
        expect(photo.resort).to eq(nearest_resort)
      end
    end

    context 'when the photo does not have latitude and longitude' do
      before do
        photo.update(latitude: nil, longitude: nil)
      end

      it 'returns a result with found? false' do
        result = described_class.new(photo).set_nearest_resort
        expect(result).not_to be_found
      end
    end

    context 'when the photo update fails' do
      before do
        allow(photo).to receive(:update).and_return(false)
      end

      it 'returns a result with found? false' do
        result = described_class.new(photo).set_nearest_resort
        expect(result).not_to be_found
      end
    end
  end
end
