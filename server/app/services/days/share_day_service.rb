class Days::ShareDayService
  def initialize(day)
    @day = day
  end

  def enable_sharing
    update_shared_at(Time.current)
  end

  def disable_sharing
    update_shared_at(nil)
  end

  private

  def update_shared_at(value)
    if @day.update(shared_at: value)
      Result.new(@day, true, nil)
    else
      Result.new(@day, false, @day.errors)
    end
  end

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

    def shared?
      @updated && @day.shared_at.present?
    end
  end
end
