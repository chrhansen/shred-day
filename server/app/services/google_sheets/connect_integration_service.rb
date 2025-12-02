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

      creation_result = GoogleSheets::SetupSpreadsheetService.new(integration).create_spreadsheet
      unless creation_result.created?
        integration.mark_error!(creation_result.error)
        return Result.new(error: creation_result.error)
      end

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
  end
end
