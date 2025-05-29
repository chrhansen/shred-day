class CsvExportShowService
  def initialize(user)
    @user = user
  end

  def fetch_seasons_and_columns
    seasons_data = fetch_seasons
    column_data = fetch_columns

    {
      seasons: seasons_data,
      columns: column_data
    }
  end

  private

  def fetch_seasons
    # should return an array of objects with the following structure:
    # {
    #   id: @season_offset.to_s, # Keep as string to match frontend expectations
    #   day_count: calculate_day_count
    # }
    available_season_offsets = AvailableSeasonsService.new(@user).fetch_available_seasons
    offset_converter = OffsetDateRangeConverterService.new(@user.season_start_day)

    seasons_data = available_season_offsets.map do |offset|
      start_date, end_date = offset_converter.date_range(offset)
      {
        id: offset.to_s,
        day_count: @user.days.where(date: start_date..end_date).count
      }
    end

    seasons_data
  end

  def fetch_columns
    # Define the columns available for export
    # The frontend will use these to populate the ColumnSelector
    [
      { id: 'date', label: 'Date', enabled: true },
      { id: 'resort_name', label: 'Resort', enabled: true },
      { id: 'skis', label: 'Skis', enabled: true },
      { id: 'activity', label: 'Activity', enabled: true },
      { id: 'season', label: 'Season', enabled: false },
      { id: 'day_number', label: 'Day #', enabled: true },
      { id: 'day_id', label: 'Day ID', enabled: false },
      { id: 'notes', label: 'Notes', enabled: false },
      { id: 'photo_count', label: 'Photo Count', enabled: false }
    ]
  end
end
