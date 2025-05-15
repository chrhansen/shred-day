class PhotoCreateService
  def initialize(photo_import, photo_params)
    @photo_import = photo_import
    @photo_params = photo_params
  end

  def create_photo
    photo = @photo_import.photos.build(user: @photo_import.user)
    photo.image.attach(@photo_params[:file])

    if photo.save
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
