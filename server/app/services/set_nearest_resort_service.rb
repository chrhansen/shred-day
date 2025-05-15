class SetNearestResortService
  def initialize(photo)
    @photo = photo
  end

  def set_nearest_resort
    unless @photo.latitude && @photo.longitude
      return Result.new(found: false, photo: @photo)
    end

    # find the nearest ski resort (resorts table) using latitude and longitude
    nearest_resort = Resort
                         .order(Arel.sql("((latitude - #{@photo.latitude})^2 + (longitude - #{@photo.longitude})^2) ASC"))
                         .first

    @photo.update(resort: nearest_resort)

    if @photo.valid?
      Result.new(found: true, photo: @photo)
    else
      Result.new(found: false, photo: @photo)
    end
  end

  private

  class Result
    attr_reader :photo

    def initialize(found:, photo:)
      @found = found
      @photo = photo
    end

    def found?
      @found
    end
  end
end
