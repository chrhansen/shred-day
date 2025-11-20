module GoogleSheets
  class SeasonLabelService
    def initialize(season_start_day)
      @converter = OffsetDateRangeConverterService.new(season_start_day)
    end

    def label_for_offset(offset)
      start_date, end_date = @converter.date_range(offset)
      "#{start_date.year}-#{end_date.year} Season"
    end
  end
end
