### Persists tokens for a user, creates the Sheet, and returns the integration record.
module GoogleSheets
  class ConnectIntegrationService
    def initialize(user:, session:, code:, state:)
      @user = user
      @session = session
      @code = code
      @state = state
    end

    def connect
      token_result = GoogleSheets::TokenExchangeService.new(session: @session, code: @code, state: @state).exchange_tokens
      return Result.new(error: token_result.error) unless token_result.exchanged?

      integration = @user.google_sheet_integration || @user.build_google_sheet_integration
      refresh_token = token_result.refresh_token.presence || integration.refresh_token

      unless refresh_token
        return Result.new(error: "Missing refresh token from Google")
      end

      integration.assign_attributes(
        access_token: token_result.access_token,
        refresh_token: refresh_token,
        access_token_expires_at: token_result.expires_at,
        status: :connected,
        last_error: nil
      )
      integration.save!

      creation_error = create_spreadsheet(integration)
      return Result.new(error: creation_error) if creation_error.present?

      Result.new(integration: integration)
    rescue StandardError => e
      Result.new(error: e.message)
    end

    class Result
      attr_reader :integration, :error

      def initialize(integration: nil, error: nil)
        @integration = integration
        @error = error
      end

      def connected?
        integration.present? && error.nil?
      end
    end

    private

    def sheets_service(integration)
      GoogleSheets::ClientFactory.new(integration).sheets_service
    end

    def create_spreadsheet(integration)
      season_offsets = AvailableSeasonsService.new(@user).fetch_available_seasons
      season_offsets = [0] if season_offsets.empty?

      converter = OffsetDateRangeConverterService.new(@user.season_start_day)
      sheets = season_offsets.map do |offset|
        Google::Apis::SheetsV4::Sheet.new(
          properties: Google::Apis::SheetsV4::SheetProperties.new(
            title: season_label(converter, offset),
            grid_properties: Google::Apis::SheetsV4::GridProperties.new(frozen_row_count: 1)
          )
        )
      end

      spreadsheet = sheets_service(integration).create_spreadsheet(
        Google::Apis::SheetsV4::Spreadsheet.new(
          properties: Google::Apis::SheetsV4::SpreadsheetProperties.new(title: "Shred Day Ski Log"),
          sheets: sheets
        )
      )

      integration.update!(
        spreadsheet_id: spreadsheet.spreadsheet_id,
        spreadsheet_url: spreadsheet.spreadsheet_url,
        status: :connected,
        last_error: nil
      )

      nil
    rescue StandardError => e
      integration.mark_error!(e.message)
      e.message
    end

    def season_label(converter, offset)
      start_date, end_date = converter.date_range(offset)
      "#{start_date.year}-#{end_date.year} Season"
    end
  end
end
