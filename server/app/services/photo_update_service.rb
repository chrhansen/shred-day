# This service is used to update a photo during a photo-import, e.g. if a user
# sets the date/resort for a photo that was missing exif data. This service
# will set the taken_at and resort (if present) and the set the photo's exif_state
# to extracted. Exit-data is not actually set and extracted. We could
# consider doing actually updating the underlying file (in an "ExifSetService"
# similar to ExifExtractService), but for now we just set the attributes on the
# photo record.
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
