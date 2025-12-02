require "google/apis/sheets_v4"

### Creates the Google Sheet (one tab per season), stores ids/URLs, and marks status.
module GoogleSheets
  class SetupSpreadsheetService
    def initialize(integration)
      @integration = integration
      @user = integration.user
      @converter = OffsetDateRangeConverterService.new(@user.season_start_day)
    end

    def create_spreadsheet
      season_offsets = AvailableSeasonsService.new(@user).fetch_available_seasons
      season_offsets = [0] if season_offsets.empty?

      sheets = season_offsets.map do |offset|
        Google::Apis::SheetsV4::Sheet.new(
          properties: Google::Apis::SheetsV4::SheetProperties.new(
            title: season_label_for_offset(offset),
            grid_properties: Google::Apis::SheetsV4::GridProperties.new(frozen_row_count: 1)
          )
        )
      end

      spreadsheet = sheets_service.create_spreadsheet(
        Google::Apis::SheetsV4::Spreadsheet.new(
          properties: Google::Apis::SheetsV4::SpreadsheetProperties.new(title: "Shred Day Ski Log"),
          sheets: sheets
        )
      )

      @integration.update!(
        spreadsheet_id: spreadsheet.spreadsheet_id,
        spreadsheet_url: spreadsheet.spreadsheet_url,
        status: :connected,
        last_error: nil
      )

      Result.new(created: true, spreadsheet_id: spreadsheet.spreadsheet_id)
    rescue StandardError => e
      @integration.mark_error!(e.message)
      Result.new(created: false, error: e.message)
    end

    private

    def sheets_service
      @sheets_service ||= GoogleSheets::ClientFactory.new(@integration).sheets_service
    end

    def season_label_for_offset(offset)
      start_date, end_date = @converter.date_range(offset)
      "#{start_date.year}-#{end_date.year} Season"
    end

    class Result
      attr_reader :spreadsheet_id, :error

      def initialize(created:, spreadsheet_id: nil, error: nil)
        @created = created
        @spreadsheet_id = spreadsheet_id
        @error = error
      end

      def created?
        @created
      end
    end
  end
end
