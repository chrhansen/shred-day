require 'rails_helper'

RSpec.describe TextImport, type: :model do
  subject(:text_import) { build(:text_import) }

  describe 'associations' do
    it { should belong_to(:user) }
    it { should have_many(:draft_days).dependent(:delete_all) }
  end

  describe 'validations' do
    it 'is valid with valid attributes' do
      expect(subject).to be_valid
    end

    it 'is not valid without a user' do
      subject.user = nil
      expect(subject).to_not be_valid
      expect(subject.errors[:user]).to include("must exist")
    end
  end

  describe 'enums' do
    it 'defines status enum with correct values' do
      expect(described_class.statuses).to eq({
        'waiting' => 0,
        'processing' => 1,
        'committed' => 2,
        'canceled' => 3,
        'failed' => 4
      })
    end

    it 'supports status predicates' do
      text_import = create(:text_import, status: :waiting)
      expect(text_import.status_waiting?).to be true
      expect(text_import.status_processing?).to be false
      expect(text_import.status_committed?).to be false
      expect(text_import.status_canceled?).to be false
      expect(text_import.status_failed?).to be false
    end

    it 'supports status transitions' do
      text_import = create(:text_import, status: :waiting)
      
      text_import.status_processing!
      expect(text_import.status_processing?).to be true
      
      text_import.status_committed!
      expect(text_import.status_committed?).to be true
    end
  end

  describe 'factory' do
    it 'creates a valid text import' do
      text_import = create(:text_import)
      expect(text_import).to be_valid
      expect(text_import.status).to eq('waiting')
      expect(text_import.user).to be_present
    end

    it 'creates text import with text using trait' do
      text_import = create(:text_import, :with_text)
      expect(text_import.original_text).to include('Aspen Mountain')
      expect(text_import.original_text).to include('Vail Resort')
    end

    it 'creates text import with different status using traits' do
      processing_import = create(:text_import, :processing)
      expect(processing_import.status_processing?).to be true

      committed_import = create(:text_import, :committed)
      expect(committed_import.status_committed?).to be true

      failed_import = create(:text_import, :failed)
      expect(failed_import.status_failed?).to be true
    end
  end

  describe 'associations behavior' do
    it 'deletes associated draft days when text import is destroyed' do
      text_import = create(:text_import)
      draft_day = create(:draft_day, :with_text_import, text_import: text_import)
      
      expect { text_import.destroy! }.to change { DraftDay.count }.by(-1)
    end

    it 'orders draft days by created_at desc' do
      text_import = create(:text_import)
      first_draft = create(:draft_day, :with_text_import, text_import: text_import, created_at: 2.days.ago)
      second_draft = create(:draft_day, :with_text_import, text_import: text_import, created_at: 1.day.ago)
      third_draft = create(:draft_day, :with_text_import, text_import: text_import, created_at: Time.current)

      expect(text_import.draft_days.to_a).to eq([third_draft, second_draft, first_draft])
    end
  end

  describe 'attributes' do
    it 'allows original_text to be nil' do
      text_import = build(:text_import, original_text: nil)
      expect(text_import).to be_valid
    end

    it 'stores original_text as text' do
      long_text = "A" * 10000 # Long text to test text field storage
      text_import = create(:text_import, original_text: long_text)
      expect(text_import.original_text).to eq(long_text)
    end

    it 'defaults status to waiting' do
      text_import = create(:text_import)
      expect(text_import.status).to eq('waiting')
    end
  end

  describe 'scopes' do
    before do
      @waiting_import = create(:text_import, status: :waiting)
      @processing_import = create(:text_import, :processing)
      @committed_import = create(:text_import, :committed)
      @failed_import = create(:text_import, :failed)
    end

    it 'can filter by status using enum scopes' do
      expect(TextImport.status_waiting).to include(@waiting_import)
      expect(TextImport.status_waiting).not_to include(@processing_import)
      
      expect(TextImport.status_processing).to include(@processing_import)
      expect(TextImport.status_processing).not_to include(@waiting_import)
      
      expect(TextImport.status_committed).to include(@committed_import)
      expect(TextImport.status_failed).to include(@failed_import)
    end
  end

  describe 'user association constraint' do
    it 'belongs to a specific user' do
      user1 = create(:user)
      user2 = create(:user)
      text_import = create(:text_import, user: user1)
      
      expect(text_import.user).to eq(user1)
      expect(text_import.user).not_to eq(user2)
    end

    it 'can have multiple text imports per user' do
      user = create(:user)
      import1 = create(:text_import, user: user)
      import2 = create(:text_import, user: user)
      
      expect(user.text_imports).to include(import1, import2)
      expect(user.text_imports.count).to eq(2)
    end
  end
end