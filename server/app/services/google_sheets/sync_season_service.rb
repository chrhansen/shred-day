require "google/apis/sheets_v4"

module GoogleSheets
  class SyncSeasonService
    HEADERS = ["Date", "Resort", "Day #", "Skis", "Tags", "Notes", "Photos", "Created At", "Updated At"].freeze

    def initialize(integration)
      @integration = integration
      @user = integration.user
      @label_service = GoogleSheets::SeasonLabelService.new(@user.season_start_day)
      @converter = OffsetDateRangeConverterService.new(@user.season_start_day)
    end

    def sync_offset(season_offset)
      ensure_sheet_exists(sheet_title(season_offset))

      range = "#{sheet_title(season_offset)}!A:Z"
      sheets_service.clear_values(@integration.spreadsheet_id, range)

      values = [HEADERS] + data_rows_for_offset(season_offset)
      value_range = Google::Apis::SheetsV4::ValueRange.new(values: values)

      sheets_service.update_spreadsheet_value(
        @integration.spreadsheet_id,
        "#{sheet_title(season_offset)}!A1",
        value_range,
        value_input_option: "RAW"
      )

      Result.new(synced: true)
    rescue StandardError => e
      @integration.mark_error!(e.message)
      Result.new(synced: false, error: e.message)
    end

    private

    def data_rows_for_offset(season_offset)
      start_date, end_date = @converter.date_range(season_offset)
      days = @user.days.includes(:resort, :skis, :tags, :photos).where(date: start_date..end_date).order(date: :asc)

      days.map do |day|
        [
          day.date&.iso8601,
          day.resort&.name,
          day.day_number,
          day.skis.map(&:name).join(", "),
          day.tags.map(&:name).join(", "),
          day.notes.to_s,
          day.photos.size,
          day.created_at&.iso8601,
          day.updated_at&.iso8601
        ]
      end
    end

    def sheet_title(season_offset)
      @label_service.label_for_offset(season_offset)
    end

    def sheets_service
      @sheets_service ||= GoogleSheets::ClientFactory.new(@integration).sheets_service
    end

    def ensure_sheet_exists(title)
      spreadsheet = sheets_service.get_spreadsheet(@integration.spreadsheet_id)
      existing_titles = spreadsheet.sheets.map { |sheet| sheet.properties.title }
      return if existing_titles.include?(title)

      request = Google::Apis::SheetsV4::Request.new(
        add_sheet: Google::Apis::SheetsV4::AddSheetRequest.new(
          properties: Google::Apis::SheetsV4::SheetProperties.new(
            title: title,
            grid_properties: Google::Apis::SheetsV4::GridProperties.new(frozen_row_count: 1)
          )
        )
      )

      batch_update_req = Google::Apis::SheetsV4::BatchUpdateSpreadsheetRequest.new(requests: [request])
      sheets_service.batch_update_spreadsheet(@integration.spreadsheet_id, batch_update_req)
    end

    class Result
      attr_reader :error

      def initialize(synced:, error: nil)
        @synced = synced
        @error = error
      end

      def synced?
        @synced
      end
    end
  end
end
