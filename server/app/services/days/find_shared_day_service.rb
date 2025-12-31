class Days::FindSharedDayService
  def initialize(day_id)
    @day_id = day_id
  end

  def find_shared_day
    day = Day.includes(:resort, :skis, :tags, :user, photos: { image_attachment: :blob })
             .where.not(shared_at: nil)
             .find_by(id: normalized_day_id)

    Result.new(day)
  end

  private

  def normalized_day_id
    @day_id.to_s.start_with?('day_') ? @day_id : "day_#{@day_id}"
  end

  class Result
    attr_reader :day

    def initialize(day)
      @day = day
    end

    def found?
      @day.present?
    end
  end
end
