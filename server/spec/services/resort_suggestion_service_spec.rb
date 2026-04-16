require 'rails_helper'

RSpec.describe ResortSuggestionService do
  include ActiveJob::TestHelper

  let(:user) { create(:user) }

  before do
    ActiveJob::Base.queue_adapter = :test
  end

  after do
    clear_enqueued_jobs
  end

  it 'creates an unverified resort suggestion for the user' do
    result = nil
    expect { result = described_class.new(user: user, name: 'Alpine Ridge', latitude: 47.0123, longitude: 11.5012).suggest_resort }
      .to have_enqueued_mail(UserMailer, :resort_suggestion_notification)

    expect(result).to be_created
    expect(result.resort.name).to eq('Alpine Ridge')
    expect(result.resort.country).to be_nil
    expect(result.resort.latitude).to eq(47.0123)
    expect(result.resort.longitude).to eq(11.5012)
    expect(result.resort.verified).to eq(false)
    expect(result.resort.suggested_by).to eq(user.id)
    expect(result.resort.suggested_at).not_to be_nil
  end

  it 'sanitizes the resort name' do
    result = described_class.new(user: user, name: 'Alp$ine*** 2.0', country: 'France').suggest_resort

    expect(result.resort.name).to eq('Alpine 2.0')
  end

  it 'creates a resort suggestion with a country when supplied' do
    result = nil
    expect { result = described_class.new(user: user, name: 'Alpine Ridge', country: 'Austria').suggest_resort }
      .to have_enqueued_mail(UserMailer, :resort_suggestion_notification)

    expect(result).to be_created
    expect(result.resort.country).to eq('Austria')
  end

  it 'returns errors for invalid coordinates' do
    result = nil
    expect { result = described_class.new(user: user, name: 'Alpine Ridge', latitude: 91, longitude: 11).suggest_resort }
      .not_to have_enqueued_mail(UserMailer, :resort_suggestion_notification)

    expect(result).not_to be_created
    expect(result.errors[:latitude]).to be_present
  end

  it 'returns errors for invalid resort' do
    result = nil
    expect { result = described_class.new(user: user, name: '', country: 'France').suggest_resort }
      .not_to have_enqueued_mail(UserMailer, :resort_suggestion_notification)

    expect(result).not_to be_created
    expect(result.errors[:name]).to be_present
  end
end
