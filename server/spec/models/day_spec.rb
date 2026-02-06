require 'rails_helper'

RSpec.describe Day, type: :model do
  # FactoryBot.build will be used. If :day factory still tries to assign a single ski,
  # this subject line will fail until the factory is updated.
  # For now, to get past the immediate error for subject, we can build without ski association initially,
  # assuming the factory will be updated to not assign a single ski directly.
  # Or, we can create a user and resort first for a more complete subject if needed by most tests.
  let(:user) { create(:user) }
  let(:resort) { create(:resort) }
  subject { build(:day, user: user, resort: resort) } # Ensure user and resort are present for basic validity

  describe 'associations' do
    it { should belong_to(:user) }
    it { should have_and_belong_to_many(:skis) }
    it { should belong_to(:resort) }
    it { should have_many(:photos).dependent(:destroy) }
    it { should have_many(:tag_days).dependent(:destroy) }
    it { should have_many(:tags).through(:tag_days) }
  end

  describe 'validations' do
    # user is already defined above
    # let(:day_attributes) { { user: user } } # This isn't used directly, user passed to factory

    it "is valid with valid attributes (using factory defaults if they are minimal)" do
      # If the factory is minimal (user, resort, date), this should pass.
      # If skis are required for some notion of full validity (not per model validations), add them.
      day = build(:day, user: user, resort: resort, date: Date.today)
      expect(day).to be_valid
    end

    it { should validate_presence_of(:date) }
    it { should validate_presence_of(:user) }
    it { should validate_presence_of(:resort) }

    it "is invalid without a date" do
      day = build(:day, user: user, resort: resort, date: nil)
      expect(day).not_to be_valid
      expect(day.errors[:date]).to include("can't be blank")
    end

    it "is valid with notes up to 500 characters" do
      day = build(:day, user: user, resort: resort, date: Date.today, notes: "a" * 500)
      expect(day).to be_valid
    end

    it "is invalid with notes longer than 500 characters" do
      day = build(:day, user: user, resort: resort, date: Date.today, notes: "a" * 501)
      expect(day).not_to be_valid
      expect(day.errors[:notes]).to include("is too long (maximum is 500 characters)")
    end
  end

  describe "#maximum_3days_per_date validation" do
    # user and target_date are already defined
    let!(:target_date) { Date.today }
    let!(:ski) { create(:ski, user: user) } # Create a ski to be used for the days

    context "when creating days" do
      it "allows creating the first 3 days for a user on a specific date" do
        day1 = create(:day, user: user, resort: resort, date: target_date, skis: [ski])
        expect(day1).to be_valid
        day2 = create(:day, user: user, resort: resort, date: target_date, skis: [ski])
        expect(day2).to be_valid
        day3 = create(:day, user: user, resort: resort, date: target_date, skis: [ski])
        expect(day3).to be_valid
      end

      it "prevents creating the 4th day for the same user on the same date" do
        3.times { create(:day, user: user, resort: resort, date: target_date, skis: [ski]) }
        fourth_day = build(:day, user: user, resort: resort, date: target_date, skis: [ski])
        expect(fourth_day).not_to be_valid
        expect(fourth_day.errors[:base]).to include("cannot log more than 3 entries for the same date")
      end

      it "allows creating more than 3 days if dates are different" do
        3.times { create(:day, user: user, resort: resort, date: target_date, skis: [ski]) }
        fourth_day_diff_date = build(:day, user: user, resort: resort, date: target_date + 1.day, skis: [ski])
        expect(fourth_day_diff_date).to be_valid
      end

      it "allows creating days for a different user on the same date" do
        other_user = create(:user)
        3.times { create(:day, user: user, resort: resort, date: target_date, skis: [ski]) }
        day_for_other_user = build(:day, user: other_user, resort: resort, date: target_date, skis: [ski])
        expect(day_for_other_user).to be_valid
      end
    end

    context "when updating days" do
      let!(:ski_for_update) { create(:ski, user: user) }
      let!(:day1) { create(:day, user: user, resort: resort, date: target_date, skis: [ski_for_update]) }
      let!(:day2) { create(:day, user: user, resort: resort, date: target_date, skis: [ski_for_update]) }
      let!(:day3) { create(:day, user: user, resort: resort, date: target_date, skis: [ski_for_update]) }

      it "allows updating an existing day without changing the date when 3 already exist" do
        day2.notes = "Updated notes"
        expect(day2).to be_valid
        expect(day2.save).to be true
      end

      it "prevents updating a day to a date that already has 3 entries for that user" do
        other_date = target_date + 1.day
        day_on_other_date = create(:day, user: user, resort: resort, date: other_date, skis: [ski_for_update])
        day_on_other_date.date = target_date
        expect(day_on_other_date).not_to be_valid
        expect(day_on_other_date.errors[:base]).to include("cannot log more than 3 entries for the same date")
      end
    end
  end

  describe 'dependent destroy for photos' do
    # user and resort are defined above
    let!(:day_with_photos) { create(:day, user: user, resort: resort) }
    # Photo factory might need user if it belongs_to user directly, or it might just need the day.
    # Adjust :photo factory if it also needs user, or remove if not directly associated.
    let!(:photo1) { create(:photo, day: day_with_photos, user: user) } # Assuming photo also needs user
    let!(:photo2) { create(:photo, day: day_with_photos, user: user) }

    it 'destroys associated photos when the day is destroyed' do
      expect { day_with_photos.destroy }.to change { Photo.count }.by(-2)
    end
  end
end
