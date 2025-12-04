class GoogleSheetsSyncJob < ApplicationJob
  queue_as :default

  def perform(integration_id, dates = nil)
    integration = GoogleSheetIntegration.find_by(id: integration_id)
    return unless integration

    GoogleSheets::SyncIntegrationService.new.sync(
      integration: integration,
      dates: dates
    )
  end
end
