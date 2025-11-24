module GoogleSheets
  class EnqueueSyncService
    def initialize(user)
      @user = user
    end

    def trigger_for_dates(dates)
      integration = @user.google_sheet_integration
      return false unless integration&.status_connected?

      offsets = season_offsets_from_dates(dates)
      return false if offsets.empty?

      GoogleSheetsSyncJob.perform_later(integration.id, offsets)
      true
    end

    private

    def season_offsets_from_dates(dates)
      converter = OffsetDateRangeConverterService.new(@user.season_start_day)
      dates.compact.map { |date| converter.season_offset(date) }.uniq
    end
  end
end
