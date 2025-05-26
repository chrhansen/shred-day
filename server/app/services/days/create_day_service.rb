class Days::CreateDayService
  def initialize(user, params)
    @user = user
    @params = params
  end

  def create_day
    day = @user.days.build(@params)
    if day.save
      DayNumberUpdaterService.new(user: @user, affected_dates: [day.date]).update!
      Result.new(day, true, nil)
    else
      Result.new(day, false, day.errors)
    end
  end

  private

  class Result
    attr_reader :day, :errors

    def initialize(day, created, errors)
      @day = day
      @created = created
      @errors = errors
    end

    def created?
      @created
    end
  end
end
