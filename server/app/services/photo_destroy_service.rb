
# This service is used to destroy a photo during a photo-import, not when simply
# creating a ski day. It will also destroy the draft day if it's the last/only
# photo for the draft-day.
class PhotoDestroyService
  def initialize(photo)
    @photo = photo
  end

  def destroy_photo
    draft_day = @photo.draft_day

    destroyed = @photo.destroy

    # The draft day may not exist. E.g. if the photo was missing-exif data
    # and therefore never connected to a draft day.
    if draft_day && draft_day.reload&.photos&.empty?
      draft_day.destroy
    end

    Result.new(destroyed: destroyed, photo: @photo)
  end

  private

  class Result
    attr_reader :photo

    def initialize(destroyed:, photo:)
      @destroyed = destroyed
      @photo = photo
    end

    def destroyed?
      @destroyed
    end
  end
end
