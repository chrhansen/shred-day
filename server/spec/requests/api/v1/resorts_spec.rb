# spec/requests/api/v1/resorts_spec.rb
require 'rails_helper'

RSpec.describe "Api::V1::Resorts", type: :request do
  let!(:user) { create(:user) }
  let!(:resort_whistler) { create(:resort, name: "Whistler Blackcomb", country: "Canada") }
  let!(:resort_kicking) { create(:resort, name: "Kicking Horse", country: "Canada") }
  let!(:resort_vail) { create(:resort, name: "Vail Ski Resort", country: "USA") }
  let!(:resort_mammoth) { create(:resort, name: "Mammoth Mountain Ski Area", country: "USA") }

  # --- Authentication Helper ---
  def login(user_to_login)
    post api_v1_sessions_path, params: { email: user_to_login.email, password: user_to_login.password }
    expect(response).to have_http_status(:ok)
  end

  describe "GET /api/v1/resorts" do
    context "when authenticated" do
      before { login(user) }

      context "with a search query" do
        it "returns resorts matching the query (case-insensitive)" do
          get api_v1_resorts_path, params: { query: "whistler" }
          expect(response).to have_http_status(:ok)
          json_response = JSON.parse(response.body)
          expect(json_response.size).to eq(1)
          expect(json_response[0]['id']).to eq(resort_whistler.id)
          expect(json_response[0]['name']).to eq("Whistler Blackcomb")
        end

        it "returns multiple resorts if query matches multiple" do
          get api_v1_resorts_path, params: { query: "ski" }
          expect(response).to have_http_status(:ok)
          json_response = JSON.parse(response.body)
          expect(json_response.size).to eq(2)
          expect(json_response.map { |r| r['id'] }).to contain_exactly(resort_vail.id, resort_mammoth.id)
        end

        it "returns resorts matching partial query" do
          get api_v1_resorts_path, params: { query: "kick" }
          expect(response).to have_http_status(:ok)
          json_response = JSON.parse(response.body)
          expect(json_response.size).to eq(1)
          expect(json_response[0]['id']).to eq(resort_kicking.id)
        end

        it "returns an empty array if query matches no resorts" do
          get api_v1_resorts_path, params: { query: "nonexistent" }
          expect(response).to have_http_status(:ok)
          json_response = JSON.parse(response.body)
          expect(json_response).to be_empty
        end
      end

      context "without a search query" do
        it "returns an empty array" do
          get api_v1_resorts_path
          expect(response).to have_http_status(:ok)
          json_response = JSON.parse(response.body)
          expect(json_response).to be_empty
        end
      end
    end

    context "when not authenticated" do
      it "returns unauthorized status" do
        get api_v1_resorts_path, params: { query: "vail" }
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end
end
