class Days::CreateDayService
  def initialize(user, params, tag_ids: nil)
    @user = user
    @params = params
    @tag_ids = tag_ids
  end

  def create_day
    day = @user.days.build(@params)
    created = false

    Day.transaction do
      unless day.save
        raise ActiveRecord::Rollback
      end

      tag_result = Days::SyncTagsService.new(day: day, user: @user, tag_ids: @tag_ids).sync
      unless tag_result.synced?
        Array(tag_result.errors).each { |error| day.errors.add(:tag_ids, error) }
        raise ActiveRecord::Rollback
      end

      DayNumberUpdaterService.new(user: @user, affected_dates: [day.date]).update!
      created = true
    end

    notify_day_created(day) if created

    Result.new(day, created, created ? nil : day.errors)
  end

  private

  def notify_day_created(day)
    result = Notifications::DayCreatedEmailService.new(day).send_notification
    return if result.sent?

    Rails.logger.warn("Day created email not sent for day #{day.id}: #{result.error}")
  end

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
