class PhotoDestroyService
  def initialize(photo)
    @photo = photo
  end

  def destroy_photo
    draft_day = @photo.draft_day

    destroyed = @photo.destroy

    if draft_day.reload.photos.empty?
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
