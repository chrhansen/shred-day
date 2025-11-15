class Days::UpdateDayService
  def initialize(day, params, tag_ids: nil)
    @day = day
    @params = params
    @tag_ids = tag_ids
  end

  def update_day
    previous_date = @day.date
    updated = false

    Day.transaction do
      unless @day.update(@params)
        raise ActiveRecord::Rollback
      end

      tag_result = Days::SyncTagsService.new(day: @day, user: @day.user, tag_ids: @tag_ids).sync
      unless tag_result.synced?
        Array(tag_result.errors).each { |error| @day.errors.add(:tag_ids, error) }
        raise ActiveRecord::Rollback
      end

      DayNumberUpdaterService.new(user: @day.user, affected_dates: [previous_date, @day.date]).update!
      updated = true
    end

    Result.new(@day, updated, updated ? nil : @day.errors)
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
