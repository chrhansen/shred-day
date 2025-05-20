require "vips"

# This service will look at the image file and extract the date/timestamp and
# GPS coordinates if they exist. It will also set the exif_state to extracted if
# the date/timestamp and GPS coordinates are present, so that we don't attempt
# to extract the data again.
class ExifExtractService
  def initialize(photo)
    @photo = photo
  end

  def extract_from_file
    data = {}

    @photo.image.blob.open do |file|

      image      = ::Vips::Image.new_from_file(file.path)
      exif_time  = safe_get(image, "exif-ifd0-DateTime")
      gps_lat    = safe_get(image, "exif-ifd3-GPSLatitude")
      gps_lat_r  = safe_get(image, "exif-ifd3-GPSLatitudeRef") # "N" / "S"
      gps_lon    = safe_get(image, "exif-ifd3-GPSLongitude")
      gps_lon_r  = safe_get(image, "exif-ifd3-GPSLongitudeRef") # "E" / "W"

      data[:taken_at] = Time.zone.strptime(exif_time, "%Y:%m:%d %H:%M:%S") if exif_time
      if gps_lat && gps_lon
        data[:lat] = dms_to_decimal(gps_lat, gps_lat_r)
        data[:lon] = dms_to_decimal(gps_lon, gps_lon_r)
      end
    end

    @photo.assign_attributes(taken_at: data[:taken_at], latitude: data[:lat], longitude: data[:lon])

    if data[:taken_at] && data[:lat] && data[:lon]
      @photo.update(exif_state: :extracted)
    else
      @photo.update(exif_state: :missing)
    end

    Result.new(extracted: @photo.exif_state_extracted?, photo: @photo)
  end

  private

  # Returns nil instead of raising if the tag is missing
  def safe_get(image, tag)
    image.get(tag) rescue nil
  end

  # exif_string
  # "50/1, 7/1, 3031/100"  →  50.1253
  # "46/1 59/1 3100/100 (46, 59, 31.00, Rational, 3 components, 24 bytes)"

  # ref
  # N (N, ASCII, 2 components, 2 bytes)
  def dms_to_decimal(exif_string, ref)
    # 1. Keep only the first three “a/b” rationals, ignore everything else.
    rationals = exif_string                  # "46/1 59/1 3100/100 ..."
                .tr(',', ' ')               # normalise commas to spaces
                .split                      # tokenise on whitespace
                .select { |t| t.include?('/') }
                .first(3)                   # ["46/1", "59/1", "3100/100"]

    return nil if rationals.size < 3         # malformed EXIF, bail early

    parts   = rationals.map { |r| Rational(r) }
    decimal = parts[0] + parts[1] / 60 + parts[2] / 3600

    %w[S W].include?(ref) ? -decimal.to_f : decimal.to_f
  end

  class Result
    attr_reader :photo

    def initialize(extracted:, photo:)
      @extracted = extracted
      @photo = photo
    end

    def extracted?
      @extracted
    end
  end
end
