require 'rails_helper'

RSpec.describe 'Offline day sync', type: :request do
  let(:user) { create(:user) }
  let(:resort) { create(:resort) }
  let(:token) { Mobile::CreateSessionService.new(user).create_session.token }
  let(:headers) { { Authorization: "Bearer #{token}" } }
  let(:input) { { date: Date.current.to_s, resort_id: resort.id, notes: 'Powder', ski_ids: [], tag_ids: [], photo_ids: [] } }
  let(:operation) { { operation_id: SecureRandom.uuid, action_type: 'save', day: input } }

  def sync(params = operation)
    post '/api/v1/mobile/day_changes', params: params, headers: headers, as: :json
  end

  it 'requires authentication' do
    post '/api/v1/mobile/day_changes', params: operation, as: :json
    expect(response).to have_http_status(:unauthorized)
  end

  it 'creates once when the acknowledgement is lost and the request is retried' do
    sync
    expect(response).to have_http_status(:ok)
    original = response.parsed_body
    expect(original.dig('day', 'notes')).to eq('Powder')
    expect(original.dig('day', 'updated_at')).to match(/\.\d{6}Z$/)
    expect { sync }.not_to change(Day, :count)
    expect(response.parsed_body).to eq(original)
    expect(user.mobile_sync_receipts.count).to eq(1)
  end

  it 'rejects a reused operation ID with different content' do
    sync
    sync(operation.merge(day: input.merge(notes: 'Different')))
    expect(response).to have_http_status(:conflict)
    expect(user.days.last.notes).to eq('Powder')
  end

  it 'preserves newer edits from another device' do
    day = create(:day, user: user, resort: resort)
    version = day.updated_at.iso8601(6)
    day.update!(notes: 'From the website')
    sync(operation.merge(day_id: day.id, version: version))
    expect(response).to have_http_status(:conflict)
    expect(response.parsed_body.dig('day', 'notes')).to eq('From the website')
    expect(day.reload.notes).to eq('From the website')
    expect(user.mobile_sync_receipts.count).to eq(0)
  end

  it 'updates with the observed version and acknowledges a retry only once' do
    day = create(:day, user: user, resort: resort)
    request = operation.merge(day_id: day.id, version: day.updated_at.iso8601(6))
    sync(request)
    expect(response).to have_http_status(:ok)
    expect(day.reload.notes).to eq('Powder')
    version = day.updated_at
    sync(request)
    expect(response).to have_http_status(:ok)
    expect(day.reload.updated_at).to eq(version)
  end

  it 'detects equipment-only changes made through the website API' do
    day = create(:day, user: user, resort: resort)
    version = day.updated_at.iso8601(6)
    ski = create(:ski, user: user)
    patch "/api/v1/days/#{day.id}", params: { day: { ski_ids: [ski.id] } }, headers: headers, as: :json
    expect(response).to have_http_status(:ok)
    sync(operation.merge(day_id: day.id, version: version))
    expect(response).to have_http_status(:conflict)
  end

  it 'deletes once and permits retry after the day has gone' do
    day = create(:day, user: user, resort: resort)
    request = { operation_id: SecureRandom.uuid, action_type: 'delete', day_id: day.id, version: day.updated_at.iso8601(6) }
    sync(request)
    expect(response).to have_http_status(:ok)
    expect(Day.exists?(day.id)).to be(false)
    sync(request)
    expect(response).to have_http_status(:ok)
    expect(response.parsed_body).to eq('day' => nil)
  end

  it 'rejects another account day, skis, tags and photos without leaving a partial day' do
    foreign_day = create(:day)
    sync(operation.merge(day_id: foreign_day.id, version: foreign_day.updated_at.iso8601(6)))
    expect(response).to have_http_status(:not_found)
    [[:ski_ids, create(:ski).id], [:tag_ids, create(:tag).id], [:photo_ids, create(:photo).id]].each do |field, id|
      expect { sync(operation.merge(day: input.merge(field => [id]))) }.not_to change(user.days, :count)
      expect(response.status).to be_in([404, 422])
    end
    expect(user.mobile_sync_receipts.count).to eq(0)
  end

  it 'validates notes and the per-date limit without acknowledging unsaved work' do
    sync(operation.merge(day: input.merge(notes: 'x' * 501)))
    expect(response).to have_http_status(:unprocessable_content)
    3.times { create(:day, user: user, resort: resort, date: Date.current) }
    sync
    expect(response).to have_http_status(:unprocessable_content)
    expect(user.days.count).to eq(3)
    expect(user.mobile_sync_receipts.count).to eq(0)
  end

  it 'returns complete days for a local season snapshot without changing the web list' do
    day = create(:day, user: user, resort: resort, date: Date.current)
    get '/api/v1/days?details=true', headers: headers
    expect(response.parsed_body.first).to include('id' => day.id, 'resort' => include('id' => resort.id), 'skis' => [], 'tags' => [])
    get '/api/v1/days', headers: headers
    expect(response.parsed_body.first).to include('resort_name' => resort.name)
  end

  it 'rolls back creates and edits if tag synchronization fails after saving the day' do
    failure = Days::SyncTagsService::Result.new(synced: false, errors: ['Tag removed during sync'])
    allow_any_instance_of(Days::SyncTagsService).to receive(:sync).and_return(failure)
    expect { sync }.not_to change(Day, :count)
    expect(response).to have_http_status(:unprocessable_content)
    day = create(:day, user: user, resort: resort, notes: 'Original')
    sync(operation.merge(day_id: day.id, version: day.updated_at.iso8601(6)))
    expect(response).to have_http_status(:unprocessable_content)
    expect(day.reload.notes).to eq('Original')
    expect(user.mobile_sync_receipts.count).to eq(0)
  end

  it 'deduplicates photo uploads independently of lost upload acknowledgements' do
    upload_id = SecureRandom.uuid
    upload = -> { fixture_file_upload('test_image.jpg', 'image/jpeg') }
    post '/api/v1/photos', params: { file: upload.call, upload_id: upload_id }, headers: headers
    expect(response).to have_http_status(:created)
    id = response.parsed_body['id']
    expect {
      post '/api/v1/photos', params: { file: upload.call, upload_id: upload_id }, headers: headers
    }.not_to change(Photo, :count)
    expect(response.parsed_body['id']).to eq(id)
  end
end
