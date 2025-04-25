require 'rails_helper'

RSpec.describe Resort, type: :model do
  # Test suite for Resort model validations
  describe 'validations' do
    # Create a valid resort instance before each test in this block
    subject { build(:resort) }

    it 'is valid with valid attributes' do
      expect(subject).to be_valid
    end

    it 'is not valid without a name' do
      subject.name = nil
      expect(subject).to_not be_valid
      expect(subject.errors[:name]).to include("can't be blank")
    end

    it 'is not valid without a country' do
      subject.country = nil
      expect(subject).to_not be_valid
      expect(subject.errors[:country]).to include("can't be blank")
    end

    context 'uniqueness of name scoped to country' do
      # Create a persisted resort before these tests
      before { create(:resort, name: "Big Sky", country: "USA") }

      it 'is not valid with a duplicate name in the same country' do
        duplicate_resort = build(:resort, name: "Big Sky", country: "USA")
        expect(duplicate_resort).to_not be_valid
        expect(duplicate_resort.errors[:name]).to include("has already been taken")
      end

      it 'is valid with the same name but different country' do
        different_country_resort = build(:resort, name: "Big Sky", country: "Canada")
        expect(different_country_resort).to be_valid
      end
    end
  end
end
