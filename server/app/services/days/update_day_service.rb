class Days::UpdateDayService
  def initialize(day, params)
    @day = day
    @params = params
  end

  def update_day
    previous_date = @day.date
    @day.update(@params)

    if @day.save
      DayNumberUpdaterService.new(user: @day.user, affected_dates: [previous_date, @day.date]).update!
      Result.new(@day, true, nil)
    else
      Result.new(@day, false, @day.errors)
    end
  end

  private

  class Result
    attr_reader :day, :errors

    def initialize(day, updated, errors)
      @day = day
      @updated = updated
      @errors = errors
    end

    def updated?
      @updated
    end
  end
end
