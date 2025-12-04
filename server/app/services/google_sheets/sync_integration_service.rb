### Orchestrates syncing an integration across season offsets using the season sync service.
module GoogleSheets
  class SyncIntegrationService
    def sync(integration:, season_offsets:)
      return unless integration.status_connected?

      offsets = Array(season_offsets).map(&:to_i).uniq
      return if offsets.empty?

      sync_service = GoogleSheets::SyncSeasonService.new(integration)
      offsets.each { |offset| sync_service.sync_offset(offset) }

      integration.update(last_synced_at: Time.current, last_error: nil, status: :connected)
    rescue StandardError => e
      integration.mark_error!(e.message)
      Rails.logger.error("[GoogleSheets::SyncIntegrationService] #{e.class}: #{e.message}")
    end
  end
end
