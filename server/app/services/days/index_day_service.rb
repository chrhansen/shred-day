class Days::IndexDayService
  def initialize(user, params)
    @user = user
    @params = params
  end

  def fetch_days
    # Get season parameter (default to 0 for current season)
    season_offset = @params[:season]&.to_i || 0

    start_date, end_date = OffsetDateRangeConverterService.new(@user.season_start_day).date_range(season_offset)

    # Filter days by the calculated date range
    days = @user.days.includes(:skis, :resort, photos: { image_attachment: :blob })
                     .where(date: start_date..end_date)
                     .order(date: :desc)

    days
  end
end
