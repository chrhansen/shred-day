require 'rails_helper'

RSpec.describe PhotoImport, type: :model do
  let(:user) { create(:user) } # Assuming you have a :user factory

  describe 'associations' do
    it { should belong_to(:user) }
    it { should have_many(:draft_days).dependent(:delete_all) }
    it { should have_many(:photos).dependent(:delete_all) }
  end

  describe 'enums' do
    # Test that the enum is defined correctly with a prefix
    # Matches: photo_import.status_waiting!, photo_import.status_processing?, etc.
    it do
      should define_enum_for(:status)
        .with_values(waiting: 0, processing: 1, committed: 2, canceled: 3, failed: 4)
        .with_prefix(:status)
    end
  end

  describe 'validations' do
    subject { build(:photo_import, user: user) } # Assuming a :photo_import factory

    it "is valid with a user" do
      expect(subject).to be_valid
    end

    it "is invalid without a user" do
      subject.user = nil
      expect(subject).not_to be_valid
      expect(subject.errors[:user]).to include("must exist") # or "can't be blank" depending on validation type
    end
  end

  describe 'default values' do
    it 'defaults status to :waiting upon initialization' do
      photo_import = PhotoImport.new(user: user)
      expect(photo_import.status).to eq("waiting")
    end
  end

  describe 'dependent :delete_all for draft_days' do
    let!(:photo_import_with_draft_days) { create(:photo_import, user: user) }
    let!(:draft_day1) { create(:draft_day, photo_import: photo_import_with_draft_days, resort: create(:resort)) } # Assuming :draft_day factory
    let!(:draft_day2) { create(:draft_day, photo_import: photo_import_with_draft_days, resort: create(:resort)) }

    it 'deletes associated draft_days when photo_import is destroyed' do
      expect { photo_import_with_draft_days.destroy }.to change { DraftDay.count }.by(-2)
    end
  end

  describe 'dependent :delete_all for photos' do
    let!(:photo_import_with_photos) { create(:photo_import, user: user) }
    # Assuming :photo factory and image attachment setup
    let!(:photo1) { create(:photo, photo_import: photo_import_with_photos, user: user, image: fixture_file_upload(Rails.root.join('spec', 'fixtures', 'files', 'test_image.jpg'), 'image/jpeg')) }
    let!(:photo2) { create(:photo, photo_import: photo_import_with_photos, user: user, image: fixture_file_upload(Rails.root.join('spec', 'fixtures', 'files', 'test_image.png'), 'image/png')) }

    it 'deletes associated photos when photo_import is destroyed' do
      expect { photo_import_with_photos.destroy }.to change { Photo.count }.by(-2)
    end
  end
end
