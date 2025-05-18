# server/spec/services/attach_to_draft_day_service_spec.rb
require 'rails_helper'

RSpec.describe AttachToDraftDayService do
  let!(:user) { create(:user) }
  let!(:photo_import) { create(:photo_import, user: user) }
  let!(:resort) { create(:resort, name: "Test Resort") }
  let(:taken_at_date) { Date.new(2023, 10, 26) }
  let(:taken_at_time) { Time.zone.local(2023, 10, 26, 10, 0, 0) }

  describe '#attach_draft_day' do
    context 'when photo is missing taken_at or resort' do
      it 'returns not attached if taken_at is missing' do
        photo = create(:photo, photo_import: photo_import, user: user, resort: resort, taken_at: nil)
        result = described_class.new(photo).attach_draft_day
        expect(result).not_to be_attached
        expect(photo.draft_day).to be_nil
      end

      it 'returns not attached if resort is missing' do
        photo = create(:photo, photo_import: photo_import, user: user, resort: nil, taken_at: taken_at_time)
        result = described_class.new(photo).attach_draft_day
        expect(result).not_to be_attached
        expect(photo.draft_day).to be_nil
      end
    end

    context 'when photo has taken_at and resort' do
      let!(:photo) { create(:photo, photo_import: photo_import, user: user, resort: resort, taken_at: taken_at_time, draft_day: nil) }

      context 'when no existing DraftDay matches date and resort' do
        it 'creates a new DraftDay and attaches the photo' do
          expect {
            described_class.new(photo).attach_draft_day
          }.to change(DraftDay, :count).by(1)

          photo.reload
          expect(photo.draft_day).not_to be_nil
          expect(photo.draft_day.date).to eq(taken_at_date)
          expect(photo.draft_day.resort).to eq(resort)
          expect(photo.draft_day.photo_import).to eq(photo_import)
        end

        it 'sets decision to :duplicate if no existing Day matches' do
          described_class.new(photo).attach_draft_day
          photo.reload
          expect(photo.draft_day.decision_duplicate?).to be true
          expect(photo.draft_day.day).to be_nil
        end

        it 'sets decision to :merge and associates Day if an existing Day matches' do
          existing_day = create(:day, user: user, resort: resort, date: taken_at_date)
          described_class.new(photo).attach_draft_day
          photo.reload
          expect(photo.draft_day.decision_merge?).to be true
          expect(photo.draft_day.day).to eq(existing_day)
        end
      end

      context 'when an existing DraftDay matches date and resort' do
        let!(:existing_draft_day) { create(:draft_day, photo_import: photo_import, resort: resort, date: taken_at_date) }

        it 'attaches the photo to the existing DraftDay' do
          expect {
            described_class.new(photo).attach_draft_day
          }.not_to change(DraftDay, :count)

          photo.reload
          expect(photo.draft_day).to eq(existing_draft_day)
        end

        it 'does not change the decision of an existing draft day if day already set' do
          existing_day = create(:day, user: user, resort: resort, date: taken_at_date)
          existing_draft_day.update(day: existing_day, decision: :merge) # Pre-set decision

          described_class.new(photo).attach_draft_day
          expect(existing_draft_day.reload.decision_merge?).to be true
        end
      end

      context 'when moving a photo from one DraftDay to another' do
        let!(:original_draft_day) { create(:draft_day, photo_import: photo_import, resort: create(:resort, name: "Old Resort"), date: taken_at_date) }
        let!(:photo_to_move) { create(:photo, photo_import: photo_import, user: user, resort: resort, taken_at: taken_at_time, draft_day: original_draft_day) }

        before do
          # Ensure original_draft_day has another photo so it's not destroyed immediately by this photo moving
          create(:photo, draft_day: original_draft_day, photo_import: photo_import, user: user)
        end

        it 'updates the photo to the new draft day' do
          described_class.new(photo_to_move).attach_draft_day
          photo_to_move.reload
          expect(photo_to_move.draft_day).not_to eq(original_draft_day)
          expect(photo_to_move.draft_day.resort).to eq(resort)
          expect(photo_to_move.draft_day.date).to eq(taken_at_date)
        end
      end

      context 'when moving the last photo from an old DraftDay' do
        let!(:old_resort) { create(:resort, name: "Old Resort Different") }
        let!(:original_draft_day) { create(:draft_day, photo_import: photo_import, resort: old_resort, date: taken_at_date) }
        let!(:photo_to_move) { create(:photo, photo_import: photo_import, user: user, resort: resort, taken_at: taken_at_time, draft_day: original_draft_day) }
        # photo_to_move is now the ONLY photo on original_draft_day

        it 'destroys the original_draft_day if it becomes empty' do
          original_draft_day_id = original_draft_day.id
          expect(DraftDay.find(original_draft_day_id).photos.count).to eq(1)

          expect {
            described_class.new(photo_to_move).attach_draft_day
          }.to change { DraftDay.exists?(original_draft_day_id) }.from(true).to(false)

          photo_to_move.reload
          expect(photo_to_move.draft_day.resort).to eq(resort)
        end
      end

      it 'returns a successful result' do
        result = described_class.new(photo).attach_draft_day
        expect(result).to be_attached
        expect(result.photo).to eq(photo)
      end
    end
  end
end
