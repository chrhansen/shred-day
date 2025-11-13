require 'rails_helper'

RSpec.describe TagDay, type: :model do
  it { should belong_to(:tag) }
  it { should belong_to(:day) }

  it "enforces uniqueness of the tag/day pair" do
    tag = create(:tag)
    day = create(:day, user: tag.user, resort: create(:resort))
    create(:tag_day, tag: tag, day: day)

    duplicate = build(:tag_day, tag: tag, day: day)
    expect(duplicate).not_to be_valid
    expect(duplicate.errors[:tag_id]).to include("has already been taken")
  end
end
