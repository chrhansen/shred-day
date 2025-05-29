class OffsetDateRangeConverterService
  def initialize(first_day_of_season) # first_day_of_season is a String in the format "MM-DD"
    @season_start_month, @season_start_day_of_month = first_day_of_season.split('-').map(&:to_i)
  end

  # Returns the start- and end-date of a season, given its offset from the
  # current season: 0 this season, -1 last season, -2 two seasons ago, etc.
  def date_range(season_offset)
    this_season_start, this_season_end = this_season_date_range
    season_offset = season_offset.to_i

    # Adjust the start and end dates by the season_offset
    # Date#years_since can take positive or negative integers
    target_season_start_date = this_season_start.years_since(season_offset)
    target_season_end_date = this_season_end.years_since(season_offset)

    [target_season_start_date, target_season_end_date]
  end

  # Returns the season a given date falls into, as an offset from the current season:
  # 0: this season, -1: last season, -2: two seasons ago, etc.
  def season_offset(date)
    date = date.to_date unless date.is_a?(Date)

    start_of_season_zero = this_season_date_range.first
    year_of_input_date = date.year

    # Determine the start date of the season that would nominally begin in the year of the input date
    season_boundary_in_input_year = Date.new(year_of_input_date, @season_start_month, @season_start_day_of_month)

    # If the input date is before this nominal start, the season it belongs to started in the previous year.
    # Otherwise, it started in the input date\'s year.
    year_the_season_for_date_started = if date < season_boundary_in_input_year
                                         year_of_input_date - 1
                                       else
                                         year_of_input_date
                                       end

    # The offset is the difference between the start year of the date's season and the start year of season zero.
    offset = year_the_season_for_date_started - start_of_season_zero.year
    offset
  end

  private

  def this_season_date_range
    # Uses @season_start_month and @season_start_day_of_month directly now
    current_year = Date.current.year
    current_season_start_year = if Date.current >= Date.new(current_year, @season_start_month, @season_start_day_of_month)
                                  current_year
                                else
                                  current_year - 1
                                end
    start_date = Date.new(current_season_start_year, @season_start_month, @season_start_day_of_month)
    end_date = start_date + 1.year - 1.day

    [start_date, end_date]
  end
end
