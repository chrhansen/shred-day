module GoogleSheets
  class ClientFactory
    def initialize(integration)
      @integration = integration
    end

    def sheets_service
      credentials = refreshed_credentials
      service = Google::Apis::SheetsV4::SheetsService.new
      service.authorization = credentials
      service
    end

    private

    def refreshed_credentials
      creds = Google::Auth::UserRefreshCredentials.new(
        client_id: GoogleSheets::Config.client_id,
        client_secret: GoogleSheets::Config.client_secret,
        scope: GoogleSheets::SCOPES,
        access_token: @integration.access_token,
        refresh_token: @integration.refresh_token,
        expires_at: @integration.access_token_expires_at,
        token_credential_uri: "https://oauth2.googleapis.com/token"
      )

      if creds.expired?
        creds.refresh!
        @integration.update(
          access_token: creds.access_token,
          refresh_token: creds.refresh_token.presence || @integration.refresh_token,
          access_token_expires_at: creds.expires_at
        )
      end

      creds
    end
  end
end
