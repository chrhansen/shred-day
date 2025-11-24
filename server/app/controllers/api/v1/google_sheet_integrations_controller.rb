module Api
  module V1
    class GoogleSheetIntegrationsController < ApplicationController
      def show
        integration = current_user.google_sheet_integration
        return render json: { connected: false } unless integration

        render json: {
          connected: integration.status_connected?,
          status: integration.status,
          sheet_url: integration.spreadsheet_url,
          last_error: integration.last_error,
          last_synced_at: integration.last_synced_at
        }
      end

      def create
        result = GoogleSheets::AuthUrlService.new(session: session).auth_url

        if result.generated?
          render json: { url: result.auth_url }
        else
          render json: { error: result.error || "Unable to start Google Sheets connection" }, status: :unprocessable_entity
        end
      end

      def update
        service_result = GoogleSheets::ConnectIntegrationService.new(
          user: current_user,
          session: session,
          code: params[:code],
          state: params[:state]
        ).connect

        if service_result.connected?
          enqueue_sync_jobs(service_result.integration)
          render json: {
            connected: true,
            sheet_url: service_result.integration.spreadsheet_url
          }, status: :ok
        else
          render json: { error: service_result.error || "Unable to connect Google Sheets" }, status: :unprocessable_entity
        end
      end

      def destroy
        integration = current_user.google_sheet_integration
        integration&.disconnect!

        head :no_content
      end

      private

      def enqueue_sync_jobs(integration)
        offsets = AvailableSeasonsService.new(current_user).fetch_available_seasons
        offsets = [0] if offsets.empty?
        GoogleSheetsSyncJob.perform_later(integration.id, offsets)
      end
    end
  end
end
