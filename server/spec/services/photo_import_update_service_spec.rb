require 'rails_helper'

RSpec.describe PhotoImportUpdateService do
  let(:user) { create(:user) }
  let(:photo_import) { create(:photo_import, user: user, status: 'waiting') }
  let(:day) { create(:day, user: user) }

  describe '#update_photo_import' do
    context 'when the photo import is canceled' do
      let(:params) { { status: 'canceled' } }

      it 'sets the status to canceled' do
        result = described_class.new(photo_import, params).update_photo_import
        expect(result).to be_updated
        expect(photo_import.status).to eq('canceled')
      end
    end

    context 'when the photo import is committed' do
      let(:params) { { status: 'committed' } }

      context 'when all draft days are processed successfully' do
        let!(:draft_day1) { create(:draft_day, photo_import: photo_import, decision: 'duplicate') }
        let!(:draft_day2) { create(:draft_day, photo_import: photo_import, day: day, decision: 'merge') }

        it 'sets the status to committed' do
          result = described_class.new(photo_import, params).update_photo_import
          expect(result).to be_updated
          expect(photo_import.status).to eq('committed')
        end
      end

      context 'when some draft days fail' do
        let!(:draft_day1) { create(:draft_day, photo_import: photo_import, decision: 'duplicate') }
        let!(:draft_day2) { create(:draft_day, photo_import: photo_import, day: day, decision: 'merge') }

        before do
          allow_any_instance_of(described_class).to receive(:create_new_day).and_return(false)
        end

        it 'sets the status to failed' do
          result = described_class.new(photo_import, params).update_photo_import
          expect(result).to be_updated
          expect(photo_import.status).to eq('failed')
        end
      end
    end

    context 'when the photo import is not in waiting status' do
      let(:photo_import) { create(:photo_import, user: user, status: 'processing') }
      let(:params) { { status: 'committed' } }

      it 'returns an error' do
        result = described_class.new(photo_import, params).update_photo_import
        expect(result).not_to be_updated
        expect(result.error).to eq('Photo import is not in waiting-status, but: "processing"')
      end
    end
  end
end
