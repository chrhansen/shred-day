class PhotoImportUpdateService
  def initialize(photo_import, photo_import_params)
    @photo_import = photo_import
    @photo_import_params = photo_import_params
  end

  def update_photo_import
    # We only want to update the photo import if it's in waiting-status
    unless @photo_import.status_waiting?
      return Result.new(updated: false, photo_import: @photo_import,
        error: "Photo import is not in waiting-status, but: \"#{@photo_import.status}\"")
    end

    new_status = @photo_import_params[:status]

    # If the photo import is canceled, we don't need to do anything
    if new_status == 'canceled'
      @photo_import.status_canceled!
      return Result.new(updated: true, photo_import: @photo_import)
    end

    @photo_import.status_processing!

    exptected = {
      new_days_count: @photo_import.draft_days.decision_duplicate.count,
      merge_day_count: @photo_import.draft_days.decision_merge.count
    }

    actual = {
      new_days_count: 0,
      merge_day_count: 0
    }

    @photo_import.draft_days.each do |draft_day|
      case draft_day.decision
      when 'merge'
        actual[:merge_day_count] += 1 if merge_draft_day(draft_day)
      when 'duplicate'
        actual[:new_days_count] += 1 if create_new_day(draft_day)
      else
        # Either pending or skip, either way, do nothing
      end
    end

    if exptected == actual
      @photo_import.status_committed!
    else
      @photo_import.status_failed!
    end

    Result.new(updated: @photo_import.valid?, photo_import: @photo_import)
  end

  private

  def merge_draft_day(draft_day)
    orig_day = draft_day.day

    draft_day.photos.each do |photo|
      photo.update(day: orig_day)
    end

    draft_day.photos.map(&:valid?).all?
  end

  def create_new_day(draft_day)
    user = draft_day.photo_import.user
    new_day = user.days.create(date: draft_day.date, resort: draft_day.resort)

    draft_day.photos.each do |photo|
      photo.update(day: new_day)
    end

    new_day.persisted?
  end

  class Result
    attr_reader :photo_import, :error

    def initialize(updated:, photo_import:, error: nil)
      @updated = updated
      @photo_import = photo_import
      @error = error
    end

    def updated?
      @updated
    end
  end
end
