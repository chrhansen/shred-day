require 'rails_helper'

RSpec.describe Photo, type: :model do
  # Use FactoryBot to create necessary records
  let(:user) { create(:user) }
  let(:resort) { create(:resort) }
  let(:ski) { create(:ski, user: user) }
  let(:day) { create(:day, user: user, resort: resort, ski: ski) }

  # Test associations
  describe 'associations' do
    it { should belong_to(:day) }

    # Test ActiveStorage attachment
    # Have to use instance_double because `have_one_attached` matcher doesn't exist by default
    # or require specific setup not worth it for this simple check.
    it "responds to #image" do
      photo = Photo.new
      expect(photo).to respond_to(:image)
    end
  end

  # Test validations (presence of day is implicitly tested by belong_to)
  describe 'validations' do
    it 'is valid with a day' do
      photo = build(:photo, day: day) # Use build to avoid saving yet
      expect(photo).to be_valid
    end

    it 'is invalid without a day' do
      photo = build(:photo, day: nil)
      expect(photo).not_to be_valid
      # Check for specific error message if needed, e.g.,
      # expect(photo.errors[:day]).to include("must exist")
    end
  end

  describe 'image attachment' do
    let(:dummy_file) { fixture_file_upload(Rails.root.join('spec', 'fixtures', 'files', 'test_image.jpg'), 'image/jpeg') }
    let(:photo) { build(:photo, day: day) }

    it 'can have an image attached, saved, retrieved, and read' do
      # Attach and save
      photo.image.attach(dummy_file)
      expect { photo.save! }.not_to raise_error
      expect(photo.image).to be_attached

      # Retrieve the record fresh from the database
      retrieved_photo = Photo.find(photo.id)

      # Check attachment status on the retrieved record
      expect(retrieved_photo.image).to be_attached

      # Check metadata
      expect(retrieved_photo.image.filename.to_s).to eq('test_image.jpg')
      expect(retrieved_photo.image.content_type).to eq('image/jpeg')
      expect(retrieved_photo.image.byte_size).to be > 0

      # Try to download the content
      downloaded_content = nil
      expect { downloaded_content = retrieved_photo.image.download }.not_to raise_error
      expect(downloaded_content).not_to be_nil
      expect(downloaded_content.length).to eq(retrieved_photo.image.byte_size)
    end
  end
end
