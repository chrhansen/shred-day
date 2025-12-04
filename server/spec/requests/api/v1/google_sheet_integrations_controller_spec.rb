require 'rails_helper'

RSpec.describe "Api::V1::GoogleSheetIntegrationsController", type: :request do
  let(:user) { create(:user) }
  before do
    allow_any_instance_of(ApplicationController).to receive(:current_user).and_return(user)
    allow_any_instance_of(ApplicationController).to receive(:require_login).and_return(true)
  end

  describe "GET /api/v1/google_sheet_integration" do
    it "returns not connected when missing" do
      get "/api/v1/google_sheet_integration"

      body = JSON.parse(response.body)
      expect(response).to have_http_status(:ok)
      expect(body["connected"]).to eq(false)
    end

    it "returns current integration details" do
      integration = create(:google_sheet_integration, user: user, spreadsheet_url: "http://sheet.url")

      get "/api/v1/google_sheet_integration"

      body = JSON.parse(response.body)
      expect(body.dig("integration", "connected")).to eq(true)
      expect(body.dig("integration", "sheet_url")).to eq("http://sheet.url")
      expect(body.dig("integration", "status")).to eq(integration.status)
    end
  end

  describe "POST /api/v1/google_sheet_integration" do
    it "returns an auth url" do
      service_result = instance_double(GoogleSheets::AuthUrlService::Result, generated?: true, auth_url: "http://auth.url", error: nil)
      service = instance_double(GoogleSheets::AuthUrlService, auth_url: service_result)
      allow(GoogleSheets::AuthUrlService).to receive(:new).and_return(service)

      post "/api/v1/google_sheet_integration"

      body = JSON.parse(response.body)
      expect(response).to have_http_status(:ok)
      expect(body["url"]).to eq("http://auth.url")
    end
  end

  describe "PATCH /api/v1/google_sheet_integration" do
    it "connects and enqueues sync" do
      integration = create(:google_sheet_integration, user: user)
      connect_result = instance_double(GoogleSheets::ConnectIntegrationService::Result, connected?: true, integration: integration, error: nil)
      connect_service = instance_double(GoogleSheets::ConnectIntegrationService, connect: connect_result)
      allow(GoogleSheets::ConnectIntegrationService).to receive(:new).and_return(connect_service)

      seasons_service = instance_double(AvailableSeasonsService, fetch_available_seasons: [0])
      allow(AvailableSeasonsService).to receive(:new).and_return(seasons_service)
      allow(GoogleSheetsSyncJob).to receive(:perform_later)

      patch "/api/v1/google_sheet_integration", params: { code: "abc", state: "state" }

      body = JSON.parse(response.body)
      expect(response).to have_http_status(:ok)
      expect(body.dig("integration", "connected")).to eq(true)
      expect(body.dig("integration", "sheet_url")).to eq(integration.spreadsheet_url)
      expect(GoogleSheetsSyncJob).to have_received(:perform_later).with(integration.id)
    end

    it "returns error when connect fails" do
      connect_result = instance_double(GoogleSheets::ConnectIntegrationService::Result, connected?: false, integration: nil, error: "boom")
      connect_service = instance_double(GoogleSheets::ConnectIntegrationService, connect: connect_result)
      allow(GoogleSheets::ConnectIntegrationService).to receive(:new).and_return(connect_service)

      patch "/api/v1/google_sheet_integration", params: { code: "abc", state: "state" }

      body = JSON.parse(response.body)
      expect(response).to have_http_status(:unprocessable_entity)
      expect(body["error"]).to eq("boom")
    end
  end

  describe "DELETE /api/v1/google_sheet_integration" do
    it "disconnects the integration" do
      integration = create(:google_sheet_integration, user: user)

      delete "/api/v1/google_sheet_integration"

      expect(response).to have_http_status(:no_content)
      expect(integration.reload).to be_status_disconnected
      expect(integration.access_token).to be_nil
      expect(integration.spreadsheet_id).to be_nil
    end
  end
end
