require 'rails_helper'
RSpec.describe 'Public app pages', type: :request do
  it 'serves privacy and support without login' do
    get '/privacy'
    expect(response).to have_http_status(:ok)
    expect(response.body).to include('Retention and deletion')
    get '/support'
    expect(response).to have_http_status(:ok)
    expect(response.body).to include('Help with your season')
  end
  it 'publishes only shared-day paths for the configured Apple team' do
    allow(Rails.application.credentials).to receive(:dig).with(:apple, :team_id).and_return('TESTTEAM')
    get '/.well-known/apple-app-site-association'
    expect(response).to have_http_status(:ok)
    expect(JSON.parse(response.body).dig('applinks', 'details', 0)).to eq('appID' => 'TESTTEAM.day.shred', 'paths' => [ '/d/*' ])
  end
end
