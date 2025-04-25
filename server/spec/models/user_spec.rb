require 'rails_helper'

RSpec.describe User, type: :model do
  # Use FactoryBot to create a valid user instance before validation tests
  subject(:user) { build(:user) } # Use subject(:user) for easier reference

  describe 'associations' do
    it { should have_many(:days).dependent(:destroy) }
    it { should have_many(:skis).dependent(:destroy) }
    it { should have_many(:recent_resorts).through(:days).source(:resort) }
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

  describe '#recent_resorts association' do
    let!(:user) { create(:user) }
    let!(:resort_a) { create(:resort, name: "Resort A") }
    let!(:resort_b) { create(:resort, name: "Resort B") }
    let!(:resort_c) { create(:resort, name: "Resort C") }
    let!(:resort_d) { create(:resort, name: "Resort D (Not Visited)") } # A resort the user hasn't visited
    let!(:ski) { create(:ski, user: user) }

    before do
      # Create days in a specific order to test sorting
      create(:day, user: user, resort: resort_b, ski: ski, date: 5.days.ago)
      create(:day, user: user, resort: resort_a, ski: ski, date: 3.days.ago)
      create(:day, user: user, resort: resort_c, ski: ski, date: 2.days.ago)
      create(:day, user: user, resort: resort_a, ski: ski, date: 1.day.ago) # Most recent visit to A
    end

    it 'returns unique resorts visited by the user' do
      expect(user.recent_resorts.map(&:name)).to match_array(["Resort A", "Resort B", "Resort C"])
      expect(user.recent_resorts).not_to include(resort_d)
    end

    it 'returns resorts ordered by the most recent visit date (descending)' do
      # Expected order: A (visited 1 day ago), C (visited 2 days ago), B (visited 5 days ago)
      expect(user.recent_resorts.map(&:name)).to eq(["Resort A", "Resort C", "Resort B"])
    end

    it 'handles multiple visits to the same resort correctly' do
      # Ensure Resort A only appears once despite multiple visits
      # Use .size instead of .count for associations with custom select/group
      expect(user.recent_resorts.size).to eq(3)
      # The order test above implicitly checks this, but explicit count is good
    end
  end
end
