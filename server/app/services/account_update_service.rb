class AccountUpdateService
  def initialize(user, params)
    @user = user
    @params = params
  end

  def update
    @user.assign_attributes(@params)
    affected_dates = @user.season_start_day_changed? ? @user.days.pluck(:date) : []

    if @user.save
      DayNumberUpdaterService.new(user: @user, affected_dates: affected_dates).update!

      Result.new(@user, true, nil)
    else
      Result.new(@user, false, @user.errors.full_messages)
    end
  end

  private

  class Result
    attr_reader :user, :errors

    def initialize(user, updated, errors)
      @user = user
      @updated = updated
      @errors = errors
    end

    def updated?
      @updated
    end
  end
end
