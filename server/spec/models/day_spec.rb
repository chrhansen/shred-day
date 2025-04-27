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
    let(:user) { create(:user) }
    let(:day_attributes) { { user: user } }

    it "is valid with valid attributes (using factory defaults)" do
      day = build(:day, user: user)
      expect(day).to be_valid
    end

    it { should validate_presence_of(:date) }
    it { should validate_presence_of(:user) }

    it "is invalid without a date" do
      day = build(:day, user: user, date: nil)
      expect(day).not_to be_valid
      expect(day.errors[:date]).to include("can't be blank")
    end
  end

  describe "#maximum_3days_per_date validation" do
    let!(:user) { create(:user) }
    let!(:target_date) { Date.today }

    context "when creating days" do
      it "allows creating the first 3 days for a user on a specific date" do
        day1 = create(:day, user: user, date: target_date)
        expect(day1).to be_valid
        day2 = create(:day, user: user, date: target_date)
        expect(day2).to be_valid
        day3 = create(:day, user: user, date: target_date)
        expect(day3).to be_valid
      end

      it "prevents creating the 4th day for the same user on the same date" do
        3.times { create(:day, user: user, date: target_date) }
        fourth_day = build(:day, user: user, date: target_date)
        expect(fourth_day).not_to be_valid
        expect(fourth_day.errors[:base]).to include("cannot log more than 3 entries for the same date")
      end

      it "allows creating more than 3 days if dates are different" do
        3.times { create(:day, user: user, date: target_date) }
        fourth_day_diff_date = build(:day, user: user, date: target_date + 1.day)
        expect(fourth_day_diff_date).to be_valid
      end

      it "allows creating days for a different user on the same date" do
        other_user = create(:user)
        3.times { create(:day, user: user, date: target_date) }
        day_for_other_user = build(:day, user: other_user, date: target_date)
        expect(day_for_other_user).to be_valid
      end
    end

    context "when updating days" do
      let!(:day1) { create(:day, user: user, date: target_date, activity: "A") }
      let!(:day2) { create(:day, user: user, date: target_date, activity: "B") }
      let!(:day3) { create(:day, user: user, date: target_date, activity: "C") }

      it "allows updating an existing day without changing the date when 3 already exist" do
        day2.activity = "Updated B"
        expect(day2).to be_valid
        expect(day2.save).to be true
      end

      it "prevents updating a day to a date that already has 3 entries for that user" do
        other_date = target_date + 1.day
        day_on_other_date = create(:day, user: user, date: other_date)
        day_on_other_date.date = target_date
        expect(day_on_other_date).not_to be_valid
        expect(day_on_other_date.errors[:base]).to include("cannot log more than 3 entries for the same date")
      end
    end
  end
end
