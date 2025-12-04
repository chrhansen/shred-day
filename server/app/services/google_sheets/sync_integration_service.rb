require "google/apis/sheets_v4"

module GoogleSheets
  class SyncIntegrationService
    HEADERS = ["Date", "Resort", "Day #", "Skis", "Tags", "Notes", "Photos"].freeze

    def initialize
      @sheets_service_cache = {}
    end

    def sync(integration:, dates: nil)
      return unless integration.status_connected?

      offsets = season_offsets(integration, dates)
      return if offsets.empty?

      offsets.each { |offset| sync_one_season(integration, offset) }

      integration.update(last_synced_at: Time.current, last_error: nil, status: :connected)
    rescue StandardError => e
      integration.mark_error!(e.message)
      Rails.logger.error("[GoogleSheets::SyncIntegrationService] #{e.class}: #{e.message}")
    end

    private

    def season_offsets(integration, dates)
      if dates.present?
        converter = OffsetDateRangeConverterService.new(integration.user.season_start_day)
        return dates.compact.map { |date| converter.season_offset(date) }.uniq
      end

      offsets = AvailableSeasonsService.new(integration.user).fetch_available_seasons
      offsets.empty? ? [0] : offsets
    end

    # Sync a single season tab by ensuring the tab exists and rewriting data.
    def sync_one_season(integration, season_offset)
      converter = OffsetDateRangeConverterService.new(integration.user.season_start_day)
      tab_title = season_label(converter, season_offset)

      ensure_sheet_exists(integration, tab_title)

      range = "#{tab_title}!A:Z"
      sheets_service(integration).clear_values(integration.spreadsheet_id, range)

      values = [HEADERS] + data_rows_for_offset(integration, converter, season_offset)
      value_range = Google::Apis::SheetsV4::ValueRange.new(values: values)

      sheets_service(integration).update_spreadsheet_value(
        integration.spreadsheet_id,
        "#{tab_title}!A1",
        value_range,
        value_input_option: "RAW"
      )
    end

    def data_rows_for_offset(integration, converter, season_offset)
      start_date, end_date = converter.date_range(season_offset)
      days = integration.user.days.includes(:resort, :skis, :tags, :photos).where(date: start_date..end_date).order(date: :desc)

      days.map do |day|
        [
          day.date&.strftime("%Y %b %-d"),
          day.resort&.name,
          day.day_number,
          day.skis.map(&:name).join(", "),
          day.tags.map(&:name).join(", "),
          day.notes.to_s,
          day.photos.size
        ]
      end
    end

    def season_label(converter, season_offset)
      start_date, end_date = converter.date_range(season_offset)
      "#{start_date.year}-#{end_date.year} Season"
    end

    def sheets_service(integration)
      @sheets_service_cache[integration.id] ||= GoogleSheets::ClientFactory.new(integration).sheets_service
    end

    def ensure_sheet_exists(integration, title)
      spreadsheet = sheets_service(integration).get_spreadsheet(integration.spreadsheet_id)
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
      sheets_service(integration).batch_update_spreadsheet(integration.spreadsheet_id, batch_update_req)
    end
  end
end
