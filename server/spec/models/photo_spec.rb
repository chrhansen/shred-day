require 'rails_helper'

RSpec.describe Photo, type: :model do
  # Use FactoryBot to create necessary records
  let(:user) { create(:user) }
  let(:resort) { create(:resort) }
  let(:ski) { create(:ski, user: user) }
  let(:day) { create(:day, user: user, resort: resort, ski: ski) }

  # Test associations
  describe 'associations' do
    it { should belong_to(:day).optional }
    it { should belong_to(:user) }

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
      photo = build(:photo, day: day) # FactoryBot associates a user
      expect(photo).to be_valid
    end

    it 'is valid without a day' do
      photo = build(:photo, day: nil)
      expect(photo).to be_valid
    end

    it 'is valid with a user' do
      photo = build(:photo) # FactoryBot associates a user
      expect(photo).to be_valid
    end

    it 'is valid without a user' do
      photo = build(:photo, user: nil)
      expect(photo).not_to be_valid
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

  describe 'image variants' do # Group variant tests
    it "defines a preview variant for the image" do
      photo = build(:photo) # Use build as we only need the instance definition

      # Check that calling variant with the name works without error
      # We need an attached image first for this check
      photo.image.attach(
        io: StringIO.new(""), # Dummy IO
        filename: 'dummy.jpg',
        content_type: 'image/jpeg'
      )
      expect { photo.image.variant(:preview) }.not_to raise_error
    end

    it "defines a full variant for the image" do
      photo = build(:photo) # Use build as we only need the instance definition
      expect { photo.image.variant(:full) }.not_to raise_error
    end
  end

  # Example of testing validation (if you uncomment the validation in the model)
  # describe 'image validation' do
  #   it 'is valid with a valid image' do
  #     photo = build(:photo, image: fixture_file_upload(Rails.root.join('spec', 'fixtures', 'files', 'test_image.jpg'), 'image/jpeg'))
  #     expect(photo).to be_valid
  #   end

  #   it 'is invalid with an invalid image' do
  #     photo = build(:photo, image: fixture_file_upload(Rails.root.join('spec', 'fixtures', 'files', 'test_image.txt'), 'text/plain'))
  #     expect(photo).not_to be_valid
  #   end
  # end
end
