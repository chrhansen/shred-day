require 'rails_helper'

RSpec.describe Ski, type: :model do
  # Use FactoryBot build
  subject { build(:ski) }

  describe 'associations' do
    it { should belong_to(:user) }
  end

  describe 'validations' do
    it 'is valid with valid attributes' do
      expect(subject).to be_valid
    end

    it { should validate_presence_of(:name) }
    it { should validate_presence_of(:user) }
  end
end
