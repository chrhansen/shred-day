
# This job is used to wrap the work we need to do on a photo during a photo-import.
# Neither of the steps below should be super intensive, but a user may drop a
# a lot of photos to import and we don't want to process all of them near
# simultaneously as the photo-upload requests arrive.
class ExtractExifAndSetNearestResortJob < ApplicationJob
  def perform(photo_id)
    photo = Photo.find(photo_id)

    result = ExifExtractService.new(photo).extract_from_file
    result = SetNearestResortService.new(photo).set_nearest_resort
    result = AttachToDraftDayService.new(photo).attach_draft_day
  end
end
