class PhotoUpdateService
  def initialize(photo, photo_params)
    @photo = photo
    @photo_params = photo_params
  end

  def update_photo
    @photo.update(@photo_params)

    if @photo.taken_at.present? && @photo.resort.present?
      @photo.exif_state_extracted!
      result = AttachToDraftDayService.new(@photo).attach_draft_day
    end

    Result.new(updated: @photo.valid?, photo: @photo)
  end

  private

  class Result
    attr_reader :photo

    def initialize(updated:, photo:)
      @updated = updated
      @photo = photo
    end

    def updated?
      @updated
    end
  end
end
