module GoogleSheets
  class SyncIntegrationService
    def sync(integration:, dates: nil)
      return unless integration.status_connected?

      offsets = season_offsets(integration, dates)
      return if offsets.empty?

      sync_service = GoogleSheets::SyncSeasonService.new(integration)
      offsets.each { |offset| sync_service.sync_offset(offset) }

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
  end
end
