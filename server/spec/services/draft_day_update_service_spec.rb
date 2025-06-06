require 'rails_helper'

RSpec.describe DraftDayUpdateService do
  let(:user) { create(:user) }
  let(:text_import) { create(:text_import, user: user) }
  let(:resort1) { create(:resort) }
  let(:resort2) { create(:resort) }
  
  describe '#update_draft_day' do
    context 'when updating date and resort to match existing draft day' do
      let!(:existing_draft) { create(:draft_day, :with_text_import, text_import: text_import, date: Date.current, resort: resort2) }
      let!(:draft_day) { create(:draft_day, :with_text_import, text_import: text_import, date: Date.current + 1.day, resort: resort1, original_text: "Original text") }
      
      it 'merges into existing draft day and deletes current one' do
        service = described_class.new(draft_day, { date: Date.current, resort_id: resort2.id })
        result = service.update_draft_day
        
        expect(result.updated?).to be true
        expect(result.merged?).to be true
        expect(result.draft_day).to eq existing_draft
        expect(DraftDay.exists?(draft_day.id)).to be false
        expect(existing_draft.reload.original_text).to include("Original text")
      end
    end
    
    context 'when updating to new date/resort combination' do
      let!(:draft_day) { create(:draft_day, :with_text_import, text_import: text_import, date: Date.current, resort: resort1) }
      let!(:existing_day) { create(:day, user: user, date: Date.current + 1.day, resort: resort2) }
      
      it 'updates draft day and sets correct day association and decision' do
        service = described_class.new(draft_day, { date: Date.current + 1.day, resort_id: resort2.id })
        result = service.update_draft_day
        
        expect(result.updated?).to be true
        expect(result.merged?).to be false
        expect(draft_day.reload.date).to eq(Date.current + 1.day)
        expect(draft_day.resort).to eq resort2
        expect(draft_day.day).to eq existing_day
        expect(draft_day.decision).to eq 'merge'
      end
    end
    
    context 'when updating to new date/resort with no existing day' do
      let!(:draft_day) { create(:draft_day, :with_text_import, text_import: text_import, date: Date.current, resort: resort1) }
      
      it 'updates draft day and sets decision to duplicate' do
        service = described_class.new(draft_day, { date: Date.current + 1.day, resort_id: resort2.id })
        result = service.update_draft_day
        
        expect(result.updated?).to be true
        expect(result.merged?).to be false
        expect(draft_day.reload.date).to eq(Date.current + 1.day)
        expect(draft_day.resort).to eq resort2
        expect(draft_day.day).to be_nil
        expect(draft_day.decision).to eq 'duplicate'
      end
    end
    
    context 'when updating decision only' do
      let!(:draft_day) { create(:draft_day, :with_text_import, text_import: text_import, date: Date.current, resort: resort1, decision: 'pending') }
      
      it 'updates decision without affecting day association' do
        original_day = draft_day.day
        service = described_class.new(draft_day, { decision: 'skip' })
        result = service.update_draft_day
        
        expect(result.updated?).to be true
        expect(result.merged?).to be false
        expect(draft_day.reload.decision).to eq 'skip'
        expect(draft_day.day).to eq original_day
      end
    end
    
    context 'with photo import' do
      let(:photo_import) { create(:photo_import, user: user) }
      let!(:photo1) { create(:photo, photo_import: photo_import) }
      let!(:photo2) { create(:photo, photo_import: photo_import) }
      let!(:existing_draft) { create(:draft_day, :with_photo_import, photo_import: photo_import, date: Date.current, resort: resort2) }
      let!(:draft_day) { create(:draft_day, :with_photo_import, photo_import: photo_import, date: Date.current + 1.day, resort: resort1) }
      
      before do
        photo1.update(draft_day: draft_day)
        photo2.update(draft_day: draft_day)
      end
      
      it 'moves photos to existing draft day when merging' do
        service = described_class.new(draft_day, { date: Date.current, resort_id: resort2.id })
        result = service.update_draft_day
        
        expect(result.updated?).to be true
        expect(result.merged?).to be true
        expect(result.draft_day).to eq existing_draft
        expect(existing_draft.photos).to include(photo1, photo2)
        expect(DraftDay.exists?(draft_day.id)).to be false
      end
    end
  end
end