### Background job: given an integration and season offsets, writes data into the sheet.
class GoogleSheetsSyncJob < ApplicationJob
  queue_as :default

  def perform(integration_id, season_offsets)
    integration = GoogleSheetIntegration.find_by(id: integration_id)
    return unless integration&.status_connected?

    offsets = Array(season_offsets).map(&:to_i).uniq
    sync_service = GoogleSheets::SyncSeasonService.new(integration)

    offsets.each do |offset|
      sync_service.sync_offset(offset)
    end

    integration.update(last_synced_at: Time.current, last_error: nil, status: :connected)
  rescue StandardError => e
    integration&.mark_error!(e.message)
    Rails.logger.error("[GoogleSheetsSyncJob] #{e.class}: #{e.message}")
  end
end
