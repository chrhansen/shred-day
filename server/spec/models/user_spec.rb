require 'rails_helper'

RSpec.describe User, type: :model do
  # Use FactoryBot to create a valid user instance before validation tests
  subject { build(:user) }

  describe 'associations' do
    it { should have_many(:days).dependent(:destroy) }
    it { should have_many(:skis).dependent(:destroy) }
  end

  describe 'validations' do
    it 'is valid with valid attributes' do
      expect(subject).to be_valid
    end

    # Email validations
    it { should validate_presence_of(:email) }
    it { should validate_uniqueness_of(:email).case_insensitive }

    it 'is not valid with an invalid email format' do
      subject.email = "invalid-email"
      expect(subject).to_not be_valid
      expect(subject.errors[:email]).to include("is invalid")
    end

    it 'is valid with a valid email format' do
      subject.email = "valid@example.com"
      expect(subject).to be_valid
    end

    # Password validations
    it { should validate_length_of(:password).is_at_least(8) }

    it 'is not valid with a short password' do
      # Build with short password, as has_secure_password validation runs on creation
      user = build(:user, password: "short")
      expect(user).to_not be_valid
      expect(user.errors[:password]).to include("is too short (minimum is 8 characters)")
    end
  end
end
