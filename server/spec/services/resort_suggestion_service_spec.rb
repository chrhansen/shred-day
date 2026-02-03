require 'rails_helper'

RSpec.describe ResortSuggestionService do
  let(:user) { create(:user) }

  it 'creates an unverified resort suggestion for the user' do
    result = described_class.new(user: user, name: 'Alpine Ridge', country: 'Austria').suggest_resort

    expect(result).to be_created
    expect(result.resort.name).to eq('Alpine Ridge')
    expect(result.resort.country).to eq('Austria')
    expect(result.resort.verified).to eq(false)
    expect(result.resort.suggested_by).to eq(user.id)
    expect(result.resort.suggested_at).not_to be_nil
  end

  it 'sanitizes the resort name' do
    result = described_class.new(user: user, name: 'Alp$ine*** 2.0', country: 'France').suggest_resort

    expect(result.resort.name).to eq('Alpine 2.0')
  end

  it 'returns errors for invalid country' do
    result = described_class.new(user: user, name: 'Alpine Ridge', country: 'Atlantis').suggest_resort

    expect(result).not_to be_created
    expect(result.errors[:country]).to be_present
  end

  it 'returns errors for invalid resort' do
    result = described_class.new(user: user, name: '', country: 'France').suggest_resort

    expect(result).not_to be_created
    expect(result.errors[:name]).to be_present
  end
end
