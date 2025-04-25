require 'rails_helper'

RSpec.describe Day, type: :model do
  # Use FactoryBot build
  subject { build(:day) }

  describe 'associations' do
    it { should belong_to(:user) }
    it { should belong_to(:ski) }
    it { should belong_to(:resort) }
  end

  describe 'validations' do
    it 'is valid with valid attributes' do
      expect(subject).to be_valid
    end

    it { should validate_presence_of(:date) }
    it { should validate_presence_of(:resort) }
    it { should validate_presence_of(:ski) }
    it { should validate_presence_of(:user) }
  end
end
