require 'rails_helper'

RSpec.describe DraftDay, type: :model do
  let(:user) { create(:user) } # Needed for photo_import typically
  let(:photo_import) { create(:photo_import, user: user) }
  let(:resort) { create(:resort) }
  let(:existing_day) { create(:day, user: user, resort: resort, date: Date.today) } # For merge tests

  subject { build(:draft_day, photo_import: photo_import, resort: resort) } # Assuming a basic :draft_day factory

  describe 'associations' do
    it { should belong_to(:photo_import) }
    it { should belong_to(:resort) }
    it { should have_many(:photos) }
    it { should belong_to(:day).optional } # Test optionality
  end

  describe 'enums' do
    it do
      should define_enum_for(:decision)
        .with_values(pending: 0, merge: 1, duplicate: 2, skip: 3)
        .with_prefix(:decision) # Or just .with_prefix if it's true by default for the first arg
    end
  end

  describe 'validations' do
    it { should validate_presence_of(:date) }

    context 'when decision is :merge' do
      before { subject.decision = :merge }
      it { should validate_presence_of(:day) }

      it 'is valid with a day association' do
        subject.day = existing_day
        subject.date = existing_day.date # Ensure date matches for consistency, though not explicitly validated here
        expect(subject).to be_valid
      end

      it 'is invalid without a day association' do
        subject.day = nil
        subject.date = Date.today # Ensure date is present to isolate day validation
        expect(subject).not_to be_valid
        expect(subject.errors[:day]).to include("can't be blank") # Or "must exist"
      end
    end

    context 'when decision is not :merge' do
      before { subject.decision = :duplicate } # or :pending, :skip
      it { should_not validate_presence_of(:day) }

      it 'is valid without a day association' do
        subject.day = nil
        subject.date = Date.today # Ensure date is present
        expect(subject).to be_valid
      end
    end

    it 'is valid with valid attributes' do
      # Minimal valid attributes based on model (photo_import, resort, date)
      dd = build(:draft_day, photo_import: photo_import, resort: resort, date: Date.today)
      expect(dd).to be_valid
    end

    it 'is invalid without a date' do
      subject.date = nil
      expect(subject).not_to be_valid
      expect(subject.errors[:date]).to include("can't be blank")
    end

    it 'is invalid without a photo_import' do # Assuming photo_import is mandatory
      subject.photo_import = nil
      expect(subject).not_to be_valid
      expect(subject.errors[:photo_import]).to include("must exist")
    end

    it 'is invalid without a resort' do # Assuming resort is mandatory
      subject.resort = nil
      expect(subject).not_to be_valid
      expect(subject.errors[:resort]).to include("must exist")
    end
  end

  describe 'default values' do
    it 'defaults decision to :pending upon initialization' do
      # Note: photo_import and resort are needed for it to be buildable if they are validated
      # The factory should handle setting these if they are mandatory for a DraftDay to exist
      draft_day = DraftDay.new(photo_import: photo_import, resort: resort, date: Date.today)
      expect(draft_day.decision).to eq("pending")
    end
  end
end
