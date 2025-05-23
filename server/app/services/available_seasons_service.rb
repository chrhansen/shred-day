class AvailableSeasonsService
  def initialize(user)
    @user = user
  end

  def fetch_available_seasons
    calculate_available_seasons
  end

  private

  def calculate_available_seasons
    return [0] if @user.days.empty?

    # Parse user's season start day
    season_start_month, season_start_day_of_month = @user.season_start_day.split('-').map(&:to_i)

    # Determine what year the current season (offset 0) started
    current_year = Date.current.year
    current_season_start_year = if Date.current >= Date.new(current_year, season_start_month, season_start_day_of_month)
                                  current_year
                                else
                                  current_year - 1
                                end

    seasons = Set.new

    # Check each day to see which season it belongs to
    @user.days.find_each do |day|
      day_date = day.date

      # Find which season this day belongs to
      # Try the year of the day and the year before
      [day_date.year - 1, day_date.year].each do |potential_season_year|
        season_start = Date.new(potential_season_year, season_start_month, season_start_day_of_month)
        season_end = season_start + 1.year - 1.day

        if day_date >= season_start && day_date <= season_end
          # Calculate offset from current season
          season_offset = potential_season_year - current_season_start_year
          seasons.add(season_offset)
          break
        end
      end
    end

    # Always include current season (0) even if no days exist yet
    seasons.add(0)

    seasons.to_a.sort.reverse # Most recent first
  end
end
