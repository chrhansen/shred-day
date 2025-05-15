class AttachToDraftDayService

  def initialize(photo)
    @photo = photo
  end

  def attach_draft_day
    unless @photo.taken_at.present? && @photo.resort.present?
      return Result.new(attached: false, photo: @photo)
    end

    orig_draft_day = @photo.draft_day

    photo_import = @photo.photo_import
    draft_day = photo_import.draft_days.find_or_create_by(date: @photo.taken_at.to_date, resort: @photo.resort)
    set_matching_day(draft_day, photo_import.user)

    @photo.update(draft_day: draft_day)

    if orig_draft_day && orig_draft_day.reload.photos.empty?
      orig_draft_day.destroy
    end

    if @photo.valid?
      Result.new(attached: true, photo: @photo)
    else
      Result.new(attached: false, photo: @photo)
    end
  end

  private

  def set_matching_day(draft_day, user)
    if draft_day.day.nil?
      day = user.days.find_by(date: draft_day.date, resort: draft_day.resort)
      draft_day.update(day: day)

      day.nil? ? draft_day.decision_duplicate! : draft_day.decision_merge!
    end

    draft_day
  end

  class Result
    attr_reader :photo

    def initialize(attached:, photo:)
      @attached = attached
      @photo = photo
    end

    def attached?
      @attached
    end
  end
end
