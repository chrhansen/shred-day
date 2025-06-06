require 'rails_helper'

RSpec.describe TextImportUpdateService do
  let(:user) { create(:user) }
  let(:text_import) { create(:text_import, user: user, status: 'waiting') }
  let(:resort) { create(:resort) }
  let(:existing_day) { create(:day, user: user, date: Date.today, resort: resort) }

  describe '#update_text_import' do
    context 'when the text import is canceled' do
      let(:params) { { status: 'canceled' } }

      it 'sets the status to canceled' do
        result = described_class.new(text_import, params).update_text_import
        expect(result).to be_updated
        expect(text_import.status).to eq('canceled')
      end

      it 'returns a successful result' do
        result = described_class.new(text_import, params).update_text_import
        expect(result).to be_updated
        expect(result.error).to be_nil
      end
    end

    context 'when the text import is committed' do
      let(:params) { { status: 'committed' } }

      context 'when all draft days are processed successfully' do
        let!(:draft_day_duplicate) do
          create(:draft_day, :with_text_import, 
                 text_import: text_import, 
                 decision: 'duplicate', 
                 resort: resort,
                 date: Date.tomorrow,
                 original_text: "2025-01-15 Test Resort")
        end
        let!(:draft_day_merge) do
          create(:draft_day, :with_text_import, 
                 text_import: text_import, 
                 day: existing_day, 
                 decision: 'merge', 
                 resort: resort,
                 date: existing_day.date)
        end
        let!(:draft_day_skip) do
          create(:draft_day, :with_text_import, 
                 text_import: text_import, 
                 decision: 'skip', 
                 resort: resort,
                 date: Date.yesterday)
        end

        it 'sets the status to committed' do
          result = described_class.new(text_import, params).update_text_import
          expect(result).to be_updated
          expect(text_import.status).to eq('committed')
        end

        it 'creates new days for duplicate decisions' do
          expect {
            described_class.new(text_import, params).update_text_import
          }.to change { Day.count }.by(1)
          
          new_day = Day.last
          expect(new_day.user).to eq(user)
          expect(new_day.date).to eq(draft_day_duplicate.date)
          expect(new_day.resort).to eq(draft_day_duplicate.resort)
          expect(new_day.notes).to include("Imported from text: 2025-01-15 Test Resort")
        end

        it 'merges days for merge decisions' do
          expect {
            described_class.new(text_import, params).update_text_import
          }.to change { Day.count }.by(1) # Only duplicate should create new day
        end

        it 'ignores skip decisions' do
          described_class.new(text_import, params).update_text_import
          # Skip decisions don't create new days
          expect(Day.where(date: draft_day_skip.date)).to be_empty
        end

        it 'updates draft day references to newly created days' do
          described_class.new(text_import, params).update_text_import
          
          draft_day_duplicate.reload
          expect(draft_day_duplicate.day).to be_present
          expect(draft_day_duplicate.day.user).to eq(user)
        end

        it 'calls DayNumberUpdaterService for new days' do
          expect(DayNumberUpdaterService).to receive(:new)
            .with(user: user, affected_dates: [draft_day_duplicate.date])
            .and_return(double(update!: true))
          
          described_class.new(text_import, params).update_text_import
        end
      end

      context 'when some draft days fail to create' do
        let!(:draft_day_duplicate) do
          create(:draft_day, :with_text_import, 
                 text_import: text_import, 
                 decision: 'duplicate', 
                 resort: resort)
        end
        let!(:draft_day_merge) do
          create(:draft_day, :with_text_import, 
                 text_import: text_import, 
                 day: existing_day, 
                 decision: 'merge', 
                 resort: resort)
        end

        before do
          # Mock day creation to fail
          allow_any_instance_of(described_class).to receive(:create_new_day).and_return(nil)
        end

        it 'sets the status to failed' do
          result = described_class.new(text_import, params).update_text_import
          expect(result).to be_updated
          expect(text_import.status).to eq('failed')
        end

        it 'still attempts to process all draft days' do
          expect_any_instance_of(described_class).to receive(:create_new_day).once
          expect_any_instance_of(described_class).to receive(:merge_draft_day).once

          described_class.new(text_import, params).update_text_import
        end
      end

      context 'when merge decision fails' do
        let!(:draft_day_merge) do
          # Create the draft day with day reference first, then clear it to test failure
          draft = create(:draft_day, :with_text_import, 
                        text_import: text_import, 
                        day: existing_day,
                        decision: 'merge', 
                        resort: resort)
          # Manually remove the day reference without triggering validation
          draft.update_column(:day_id, nil)
          draft
        end

        it 'sets the status to failed when merge expectations are not met' do
          result = described_class.new(text_import, params).update_text_import
          expect(result).to be_updated
          expect(text_import.status).to eq('failed')
        end
      end

      context 'when text import only has pending decisions' do
        let!(:draft_day_pending) do
          create(:draft_day, :with_text_import, 
                 text_import: text_import, 
                 decision: 'pending', 
                 resort: resort)
        end

        it 'sets the status to committed (no actions needed)' do
          result = described_class.new(text_import, params).update_text_import
          expect(result).to be_updated
          expect(text_import.status).to eq('committed')
        end

        it 'does not create any new days' do
          expect {
            described_class.new(text_import, params).update_text_import
          }.not_to change { Day.count }
        end
      end
    end

    context 'when the text import is not in waiting status' do
      let(:text_import) { create(:text_import, user: user, status: 'processing') }
      let(:params) { { status: 'committed' } }

      it 'returns an error' do
        result = described_class.new(text_import, params).update_text_import
        expect(result).not_to be_updated
        expect(result.error).to eq('Text import is not in waiting-status, but: "processing"')
      end

      it 'does not change the status' do
        expect {
          described_class.new(text_import, params).update_text_import
        }.not_to change { text_import.status }
      end
    end

    context 'when text import is already committed' do
      let(:text_import) { create(:text_import, user: user, status: 'committed') }
      let(:params) { { status: 'committed' } }

      it 'returns an error' do
        result = described_class.new(text_import, params).update_text_import
        expect(result).not_to be_updated
        expect(result.error).to include('not in waiting-status')
      end
    end

    context 'when text import is already failed' do
      let(:text_import) { create(:text_import, user: user, status: 'failed') }
      let(:params) { { status: 'committed' } }

      it 'returns an error' do
        result = described_class.new(text_import, params).update_text_import
        expect(result).not_to be_updated
        expect(result.error).to include('not in waiting-status')
      end
    end
  end

  describe 'Result class' do
    it 'has updated? predicate method' do
      result = described_class::Result.new(updated: true, text_import: text_import)
      expect(result).to be_updated

      result = described_class::Result.new(updated: false, text_import: text_import)
      expect(result).not_to be_updated
    end

    it 'stores text_import and error' do
      error_msg = "Test error"
      result = described_class::Result.new(updated: false, text_import: text_import, error: error_msg)
      
      expect(result.text_import).to eq(text_import)
      expect(result.error).to eq(error_msg)
    end
  end

  describe 'private methods' do
    let(:service) { described_class.new(text_import, { status: 'committed' }) }

    describe '#merge_draft_day' do
      context 'when draft day has an existing day' do
        let(:draft_day) { create(:draft_day, :with_text_import, text_import: text_import, day: existing_day) }

        it 'returns true' do
          result = service.send(:merge_draft_day, draft_day)
          expect(result).to be true
        end
      end

      context 'when draft day has no existing day' do
        let(:draft_day) { create(:draft_day, :with_text_import, text_import: text_import, day: nil) }

        it 'returns false' do
          result = service.send(:merge_draft_day, draft_day)
          expect(result).to be false
        end
      end
    end

    describe '#create_new_day' do
      let(:draft_day) do
        create(:draft_day, :with_text_import, 
               text_import: text_import, 
               resort: resort, 
               date: Date.tomorrow,
               original_text: "Test import text")
      end

      it 'creates a new day with correct attributes' do
        new_day = service.send(:create_new_day, draft_day)
        
        expect(new_day).to be_present
        expect(new_day.user).to eq(user)
        expect(new_day.date).to eq(draft_day.date)
        expect(new_day.resort).to eq(draft_day.resort)
        expect(new_day.notes).to include("Imported from text: Test import text")
      end

      it 'updates the draft day with reference to new day' do
        new_day = service.send(:create_new_day, draft_day)
        
        draft_day.reload
        expect(draft_day.day).to eq(new_day)
      end

      it 'handles multiline original text by converting to single line' do
        draft_day.update!(original_text: "Line 1\nLine 2\r\nLine 3")
        
        new_day = service.send(:create_new_day, draft_day)
        expect(new_day.notes).to eq("Imported from text: Line 1 Line 2 Line 3")
      end

      it 'handles nil original text gracefully' do
        draft_day.update!(original_text: nil)
        
        new_day = service.send(:create_new_day, draft_day)
        expect(new_day.notes).to be_nil
      end

      context 'when day creation fails' do
        before do
          # Make resort invalid to cause day creation to fail
          allow(draft_day).to receive(:resort).and_return(nil)
        end

        it 'returns nil' do
          new_day = service.send(:create_new_day, draft_day)
          expect(new_day).to be_nil
        end
      end
    end
  end
end