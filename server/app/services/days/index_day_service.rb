class Days::IndexDayService
  def initialize(user, params)
    @user = user
    @params = params
  end

  def fetch_days
    # Get season parameter (default to 0 for current season)
    season_offset = @params[:season]&.to_i || 0

    # Parse user's season start day (e.g., "09-15" for Sep. 15th)
    season_start_month, season_start_day = @user.season_start_day.split('-').map(&:to_i)

    # First, determine what year the current season (offset 0) started
    current_year = Date.current.year
    current_season_start_year = if Date.current >= Date.new(current_year, season_start_month, season_start_day)
                                  current_year
                                else
                                  current_year - 1
                                end

    # Apply the season offset to get the target season start year
    target_season_start_year = current_season_start_year + season_offset

    # Calculate date range for the target season
    start_date = Date.new(target_season_start_year, season_start_month, season_start_day)
    end_date = start_date + 1.year - 1.day

    # Filter days by the calculated date range
    days = @user.days.includes(:skis, :resort, photos: { image_attachment: :blob })
                     .where(date: start_date..end_date)
                     .order(date: :desc)

    days
  end
end
