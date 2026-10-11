require 'rails_helper'

RSpec.describe 'Mobile sessions', type: :request do
  let(:user) { create(:user) }
  let(:login) { { email: user.email, password: 'password123' } }
  let(:root) { '/api/v1/mobile' }

  def sign_in
    post "#{root}/sessions", params: login, as: :json
    expect(response).to have_http_status(:created)
    JSON.parse(response.body)['token']
  end

  it 'stores only a digest and authenticates the existing API' do
    token = sign_in
    stored = MobileSession.last
    expect(stored.token_digest).to eq(Digest::SHA256.hexdigest(token))
    expect(stored.attributes.values).not_to include(token)
    get '/api/v1/account', headers: { Authorization: "Bearer #{token}" }
    expect(response).to have_http_status(:ok)
    expect(JSON.parse(response.body)['id']).to eq(user.id)
  end

  it 'does not create a browser session during mobile login' do
    sign_in
    get '/api/v1/account'
    expect(response).to have_http_status(:unauthorized)
  end

  it 'rejects the wrong password without a token' do
    post "#{root}/sessions", params: login.merge(password: 'wrong'), as: :json
    expect(response).to have_http_status(:unauthorized)
    expect(MobileSession.count).to eq(0)
  end

  it 'expires a mobile token' do
    token = sign_in
    MobileSession.last.update!(expires_at: 1.second.ago)
    get '/api/v1/days', headers: { Authorization: "Bearer #{token}" }
    expect(response).to have_http_status(:unauthorized)
  end

  it 'revokes only this device session on logout' do
    token = sign_in
    other = Mobile::CreateSessionService.new(user).create_session
    delete "#{root}/sessions", headers: { Authorization: "Bearer #{token}" }
    expect(response).to have_http_status(:no_content)
    expect(MobileSession.find_by_token(token)).to be_nil
    expect(MobileSession.find_by_token(other.token)).to be_present
  end

  it 'keeps browser login working and rejects an invalid supplied bearer' do
    post '/api/v1/sessions', params: login, as: :json
    get '/api/v1/account'
    expect(response).to have_http_status(:ok)
    get '/api/v1/account', headers: { Authorization: 'Bearer invalid' }
    expect(response).to have_http_status(:unauthorized)
    get '/api/v1/account', headers: { Authorization: 'Basic invalid' }
    expect(response).to have_http_status(:unauthorized)
    get '/api/v1/account'
    expect(response).to have_http_status(:ok)
  end

  it 'prevents access to another account day' do
    token = sign_in
    other_day = create(:day)
    get "/api/v1/days/#{other_day.id}", headers: { Authorization: "Bearer #{token}" }
    expect(response).to have_http_status(:not_found)
  end

  it 'creates an account with the existing default tags' do
    expect { post "#{root}/users", params: { user: { email: 'mobile@example.com', password: 'good-password' } }, as: :json }.to change(User, :count).by(1)
    expect(response).to have_http_status(:created)
    expect(User.last.tags).to be_present
    expect(JSON.parse(response.body)['token']).to be_present
  end

  it 'returns validation errors for invalid signup' do
    post "#{root}/users", params: { user: { email: 'invalid', password: 'short' } }, as: :json
    expect(response).to have_http_status(:unprocessable_content)
  end

  it 'requires mobile login and recent authentication for deletion' do
    delete "#{root}/account", params: { confirmation: 'DELETE' }, as: :json
    expect(response).to have_http_status(:unauthorized)
    token = sign_in
    MobileSession.last.update!(created_at: 6.minutes.ago)
    delete "#{root}/account", params: { confirmation: 'DELETE' }, headers: { Authorization: "Bearer #{token}" }, as: :json
    expect(response).to have_http_status(:unauthorized)
    expect(user.reload).to be_present
  end

  it 'requires an explicit deletion confirmation' do
    token = sign_in
    delete "#{root}/account", headers: { Authorization: "Bearer #{token}" }, as: :json
    expect(response).to have_http_status(:unauthorized)
    expect(User.exists?(user.id)).to be(true)
  end

  it 'deletes the account and its data, preserving other users and suggested resorts' do
    other = create(:user)
    day = create(:day, user: user)
    photo = create(:photo, user: user, day: day)
    create(:tag, user: user)
    create(:ski, user: user)
    create(:photo_import, user: user)
    create(:text_import, user: user)
    create(:google_sheet_integration, user: user)
    resort = create(:resort, suggested_by: user.id)
    token = sign_in
    delete "#{root}/account", params: { confirmation: 'DELETE' }, headers: { Authorization: "Bearer #{token}" }, as: :json
    expect(response).to have_http_status(:no_content)
    expect(User.exists?(user.id)).to be(false)
    expect(Day.exists?(day.id)).to be(false)
    expect(Photo.exists?(photo.id)).to be(false)
    expect(MobileSession.count).to eq(0)
    expect(User.exists?(other.id)).to be(true)
    expect(resort.reload.suggested_by).to be_nil
  end
end
