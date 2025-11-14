require 'rails_helper'

RSpec.describe Tag, type: :model do
  it { should belong_to(:user) }
  it { should have_many(:tag_days).dependent(:restrict_with_error) }
  it { should have_many(:days).through(:tag_days) }

  it { should validate_presence_of(:name) }
  it { should validate_length_of(:name).is_at_most(40) }

  it "validates uniqueness of name scoped to the user (case insensitive)" do
    user = create(:user)
    create(:tag, user: user, name: "Friends")

    duplicate = build(:tag, user: user, name: "friends")
    expect(duplicate).not_to be_valid
    expect(duplicate.errors[:name]).to include("has already been taken")
  end
end
