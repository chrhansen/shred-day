require 'rails_helper'

RSpec.describe ResortSuggestionService do
  let(:user) { create(:user) }

  it 'creates an unverified resort suggestion for the user' do
    result = described_class.new(current_user: user).suggest_resort(name: 'Alpine Ridge', country: 'Austria')

    expect(result).to be_created
    expect(result.resort.name).to eq('Alpine Ridge')
    expect(result.resort.country).to eq('Austria')
    expect(result.resort.verified).to eq(false)
    expect(result.resort.suggested_by).to eq(user.id)
    expect(result.resort.suggested_at).not_to be_nil
  end

  it 'sanitizes the resort name' do
    result = described_class.new(current_user: user).suggest_resort(name: 'Alp$ine*** 2.0', country: 'France')

    expect(result.resort.name).to eq('Alpine 2.0')
  end

  it 'returns errors for invalid resort' do
    result = described_class.new(current_user: user).suggest_resort(name: '', country: 'France')

    expect(result).not_to be_created
    expect(result.errors[:name]).to be_present
  end
end
