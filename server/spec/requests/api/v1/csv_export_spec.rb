require 'rails_helper'

RSpec.describe "Api::V1::CsvExport", type: :request do
  include ActiveSupport::Testing::TimeHelpers # For travel_to

  let!(:user) { create(:user, season_start_day: "09-01") } # Default season start for user
  let(:offset_converter) { OffsetDateRangeConverterService.new(user.season_start_day) }

  describe "GET #show" do
    context "when authenticated" do
      before do
        post api_v1_session_path, params: { email: user.email, password: user.password }
        expect(response).to have_http_status(:ok) # Confirm login was successful
      end

      it "returns a successful response and correct structure" do
        # Travel to a specific date to make season calculations predictable
        travel_to Date.new(2023, 10, 15) do
          # Create some days for the user to make dayCount meaningful
          current_season_range = offset_converter.date_range(0)
          last_season_range = offset_converter.date_range(-1)
          create(:day, user: user, date: current_season_range[0] + 5.days) # 1 day in current season
          create(:day, user: user, date: last_season_range[0] + 10.days)
          create(:day, user: user, date: last_season_range[0] + 20.days) # 2 days in last season

          get api_v1_csv_export_path
          expect(response).to be_successful
          json_response = JSON.parse(response.body).deep_symbolize_keys

          expect(json_response).to have_key(:seasons)
          expect(json_response).to have_key(:columns)

          # Check seasons structure (assuming AvailableSeasonsService and SeasonDetailService work correctly)
          # We expect data for season 0 (current) and season -1 (last) based on created days
          # And always season 0 as per AvailableSeasonsService logic
          expect(json_response[:seasons].map { |s| s[:id] }).to match_array(["0", "-1"])

          current_season_data = json_response[:seasons].find { |s| s[:id] == "0" }
          expect(current_season_data[:day_count]).to eq(1)

          last_season_data = json_response[:seasons].find { |s| s[:id] == "-1" }
          expect(last_season_data[:day_count]).to eq(2)

          # Check columns structure (as defined in CsvExportShowService)
          expected_columns = [
            { id: 'date', label: 'Date', enabled: true },
            { id: 'resort_name', label: 'Resort', enabled: true },
            { id: 'skis', label: 'Skis', enabled: true },
            { id: 'activity', label: 'Activity', enabled: true },
            { id: 'season', label: 'Season', enabled: false },
            { id: 'day_number', label: 'Day #', enabled: true },
            { id: 'day_id', label: 'Day ID', enabled: false },
            { id: 'notes', label: 'Notes', enabled: false },
            { id: 'photo_count', label: 'Photo Count', enabled: false }
          ]
          expect(json_response[:columns]).to match_array(expected_columns.map { |ec| ec.deep_symbolize_keys })
        end
      end
    end

    context "when not authenticated" do
      it "returns an unauthorized status" do
        get api_v1_csv_export_path
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end

  describe "POST #create" do
    let!(:resort1) { create(:resort, name: "Snow Valley") }
    let!(:ski1) { create(:ski, name: "Alpine Cruiser") }
    let!(:ski2) { create(:ski, name: "Powder King") }

    context "when authenticated" do
      before do
        post api_v1_session_path, params: { email: user.email, password: user.password }
        expect(response).to have_http_status(:ok)
      end

      it "returns a CSV file with correct headers and data" do
        travel_to Date.new(2023, 10, 15) do # Consistent date for season calculations
          current_season_range = offset_converter.date_range(0)
          day1_date = current_season_range[0] + 5.days
          day2_date = current_season_range[0] + 10.days

          create(:day, user: user, date: day1_date, resort: resort1, skis: [ski1], activity: "Resort Skiing", notes: "Fun day!")
          create(:day, user: user, date: day2_date, resort: resort1, skis: [ski1, ski2], activity: "Powder Day")
          DayNumberUpdaterService.new(user: user, affected_dates: [day1_date, day2_date]).update!


          selected_columns = [
            { id: "date", label: "Date", enabled: true },
            { id: "resort_name", label: "Resort", enabled: true },
            { id: "skis", label: "Skis", enabled: true },
            { id: "activity", label: "Activity", enabled: true },
            { id: "season", label: "Season", enabled: true },
            { id: "day_number", label: "Day #", enabled: true },
            { id: "notes", label: "Notes", enabled: true },
            { id: "photo_count", label: "Photo Count", enabled: false }
          ]

          post api_v1_csv_export_path, params: { season_ids: ["0"], columns: selected_columns }

          expect(response).to be_successful
          expect(response.content_type).to start_with("text/csv; charset=utf-8")
          expect(response.headers["Content-Disposition"]).to include("attachment; filename=shred_day_export_")

          csv_data = CSV.parse(response.body)
          expect(csv_data.length).to eq(3) # Header + 2 data rows
          expect(csv_data[0]).to eq(["Date", "Resort", "Skis", "Activity", "Season", "Day #", "Notes"]) # Headers
          expect(csv_data[1]).to eq([day2_date.iso8601, "Snow Valley", "Alpine Cruiser, Powder King", "Powder Day", "0", 2.to_s, nil])
          expect(csv_data[2]).to eq([day1_date.iso8601, "Snow Valley", "Alpine Cruiser", "Resort Skiing", "0", 1.to_s, "Fun day!"])
        end
      end

      it "returns bad request if no seasons are selected" do
        post api_v1_csv_export_path, params: { season_ids: [], columns: [{id: "date", label: "Date", enabled: true}] }
        expect(response).to have_http_status(:bad_request)
      end

      it "returns bad request if no columns are enabled" do
        post api_v1_csv_export_path, params: { season_ids: ["0"], columns: [{id: "date", label: "Date", enabled: "false"}] }
        expect(response).to have_http_status(:bad_request)
      end
    end

    context "when not authenticated" do
      it "returns an unauthorized status" do
        post api_v1_csv_export_path, params: { season_ids: ["0"], columns: [{id: "date", label: "Date", enabled: true}] }
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end
end
