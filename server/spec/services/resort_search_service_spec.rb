require 'rails_helper'

RSpec.describe ResortSearchService do
  let(:user) { create(:user) }
  let(:other_user) { create(:user) }

  it 'returns empty results when query is blank' do
    result = described_class.new(current_user: user).search_resorts(query: '')
    expect(result.resorts).to be_empty
  end

  it 'returns verified resorts matching the query' do
    resort = create(:resort, name: 'Snow Peak', verified: true)

    result = described_class.new(current_user: user).search_resorts(query: 'snow')

    expect(result.resorts.map(&:id)).to contain_exactly(resort.id)
  end

  it 'includes unverified resorts suggested by the current user' do
    suggested = create(:resort, name: 'Hidden Ridge', verified: false, suggested_by: user.id, suggested_at: Time.current)
    create(:resort, name: 'Hidden Canyon', verified: false, suggested_by: other_user.id, suggested_at: Time.current)

    result = described_class.new(current_user: user).search_resorts(query: 'hidden')

    expect(result.resorts.map(&:id)).to contain_exactly(suggested.id)
  end
end
