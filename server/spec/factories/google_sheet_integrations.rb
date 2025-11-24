FactoryBot.define do
  factory :google_sheet_integration do
    association :user
    spreadsheet_id { "sheet_#{SecureRandom.hex(4)}" }
    spreadsheet_url { "https://docs.google.com/spreadsheets/d/#{spreadsheet_id}" }
    access_token { "ya29.access" }
    refresh_token { "refresh-token" }
    access_token_expires_at { 1.hour.from_now }
    status { :connected }
  end
end
