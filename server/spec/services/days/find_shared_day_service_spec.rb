require 'rails_helper'

RSpec.describe Days::FindSharedDayService do
  let!(:user) { create(:user) }
  let!(:resort) { create(:resort) }
  let!(:shared_day) { create(:day, user: user, resort: resort, shared_at: Time.current) }
  let!(:unshared_day) { create(:day, user: user, resort: resort, shared_at: nil) }

  it "returns shared day for full id" do
    result = described_class.new(shared_day.id).find_shared_day
    expect(result.found?).to be(true)
    expect(result.day).to eq(shared_day)
  end

  it "returns shared day for short id" do
    short_id = shared_day.id.delete_prefix('day_')
    result = described_class.new(short_id).find_shared_day
    expect(result.found?).to be(true)
    expect(result.day).to eq(shared_day)
  end

  it "returns no day when not shared" do
    result = described_class.new(unshared_day.id).find_shared_day
    expect(result.found?).to be(false)
    expect(result.day).to be_nil
  end
end
