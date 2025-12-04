class GoogleSheetsSyncJob < ApplicationJob
  queue_as :default

  def perform(integration_id, season_offsets)
    integration = GoogleSheetIntegration.find_by(id: integration_id)
    return unless integration

    GoogleSheets::SyncIntegrationService.new.sync(
      integration: integration,
      season_offsets: season_offsets
    )
  end
end
