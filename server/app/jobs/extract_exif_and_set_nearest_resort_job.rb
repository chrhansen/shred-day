
class ExtractExifAndSetNearestResortJob < ApplicationJob
  def perform(photo_id)
    photo = Photo.find(photo_id)

    result = ExifExtractService.new(photo).extract_from_file
    result = SetNearestResortService.new(photo).set_nearest_resort
    result = AttachToDraftDayService.new(photo).attach_draft_day
  end
end
