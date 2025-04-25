# spec/requests/api/v1/recent_resorts_spec.rb
require 'rails_helper'

RSpec.describe "Api::V1::RecentResorts", type: :request do
  let!(:user) { create(:user) }
  let!(:resort1) { create(:resort, name: "Resort Alpha") }
  let!(:resort2) { create(:resort, name: "Resort Beta") }
  let!(:resort3) { create(:resort, name: "Resort Gamma") }
  let!(:resort4) { create(:resort, name: "Resort Delta") }
  let!(:resort5) { create(:resort, name: "Resort Epsilon") }
  let!(:resort6) { create(:resort, name: "Resort Zeta") }
  let!(:ski) { create(:ski, user: user) }

  # --- Authentication Helper ---
  def login(user_to_login)
    post api_v1_session_path, params: { email: user_to_login.email, password: user_to_login.password }
    expect(response).to have_http_status(:ok)
  end

  describe "GET /api/v1/recent_resorts" do
    context "when authenticated" do
      before { login(user) }

      context "with logged days" do
        before do
          # Log days with specific dates to control order
          # Most recent date: resort3
          create(:day, user: user, resort: resort3, ski: ski, date: Date.today)
          # Second most recent date: resort1 (logged twice, but last actual ski date is older)
          create(:day, user: user, resort: resort1, ski: ski, date: Date.today - 2.days)
          create(:day, user: user, resort: resort1, ski: ski, date: Date.today - 1.day)
          # Third most recent date: resort5
          create(:day, user: user, resort: resort5, ski: ski, date: Date.today - 3.days)
          # Fourth most recent date: resort2
          create(:day, user: user, resort: resort2, ski: ski, date: Date.today - 4.days)
          # Fifth most recent date: resort4
          create(:day, user: user, resort: resort4, ski: ski, date: Date.today - 5.days)
          # Sixth most recent date (should be excluded): resort6
          create(:day, user: user, resort: resort6, ski: ski, date: Date.today - 6.days)
        end

        it "returns the top 5 most recently visited unique resorts in order" do
          get api_v1_recent_resorts_path
          expect(response).to have_http_status(:ok)

          json_response = JSON.parse(response.body)
          expect(json_response.size).to eq(5)

          # Verify the order based on the last visit *date*
          expect(json_response.map { |r| r['id'] }).to eq([
            resort3.id, # Date: today
            resort1.id, # Last Date: yesterday
            resort5.id, # Date: 3 days ago
            resort2.id, # Date: 4 days ago
            resort4.id  # Date: 5 days ago
          ])

          # Verify names just to be sure
          expect(json_response.map { |r| r['name'] }).to eq([
            resort3.name,
            resort1.name,
            resort5.name,
            resort2.name,
            resort4.name
          ])
        end
      end

      context "with no logged days" do
        it "returns an empty array" do
          get api_v1_recent_resorts_path
          expect(response).to have_http_status(:ok)
          json_response = JSON.parse(response.body)
          expect(json_response).to be_empty
        end
      end
    end

    context "when not authenticated" do
      it "returns unauthorized status" do
        get api_v1_recent_resorts_path
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end
end
