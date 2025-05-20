# This service is used to create a new photo during a photo-import, i.e. it's not
# used when a user uploads a photo to simple create a day. Teh service will
# extract the exif data, lookup and set nearest ski resort, and finally, attach
# the photo to a draft day.
class PhotoCreateService
  def initialize(photo_import, photo_params)
    @photo_import = photo_import
    @photo_params = photo_params
  end

  def create_photo
    photo = @photo_import.photos.build(user: @photo_import.user)
    photo.image.attach(@photo_params[:file])

    if photo.image.attached? && photo.save
      ::ExtractExifAndSetNearestResortJob.perform_later(photo.id)
      Result.new(created: true, photo: photo)
    else
      Result.new(created: false, photo: photo)
    end
  end

  private

  class Result
    attr_reader :photo

    def initialize(created:, photo:)
      @created = created
      @photo = photo
    end

    def created?
      @created
    end
  end
end
