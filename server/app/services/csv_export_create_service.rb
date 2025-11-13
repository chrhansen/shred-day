require 'csv'

class CsvExportCreateService
  def initialize(user, season_ids, columns)
    @user = user

    @season_ids = season_ids.compact_blank
    @columns = columns
  end

  def create_csv_string
    ordered_enabled_columns = @columns.filter { |col| col[:enabled].to_s == "true" }

    if  @season_ids.empty? || ordered_enabled_columns.empty?
      return Result.new(csv_string: nil, created: false, error: "No seasons or columns selected for export.")
    end

    all_days_for_export = []
    offset_converter_instance = OffsetDateRangeConverterService.new(@user.season_start_day)

     @season_ids.each do |offset|
      start_date, end_date = offset_converter_instance.date_range(offset)
      days_in_season = @user.days.includes(:resort, :skis, :photos).where(date: start_date..end_date).order(date: :desc)

      all_days_for_export.concat(days_in_season.to_a)
    end

    csv_string = CSV.generate do |csv|
      # Add Headers
      csv << ordered_enabled_columns.map { |col| col[:label] }
      all_days_for_export.each do |day|
        csv_row = ordered_enabled_columns.map do |column_config|
          # column_config is now an ActionController::Parameters, access with string or symbol keys
          case column_config[:id].to_s # Ensure ID is a string for case matching
          when 'date'
            day.date&.iso8601
          when 'resort_name'
            day.resort&.name
          when 'resort_country'
            day.resort&.country
          when 'skis'
            day.skis.map(&:name).join(', ')
          when 'tags'
            day.tags.map(&:name).join(', ')
          when 'season'
            offset_converter_instance.season_offset(day.date).to_s
          when 'day_number'
            day.day_number
          when 'day_id'
            day.id
          when 'notes'
            # Sanitize notes to prevent CSV corruption from embedded newlines
            day.notes&.gsub(/\r\n?|\n/, ' ')
          when 'photo_count'
            day.photos.count
          else
            nil
          end
        end
        csv << csv_row
      end
    end

    if csv_string.present?
      Result.new(csv_string: csv_string, created: true, error: nil)
    else
      Result.new(csv_string: nil, created: false, error: "Could not create CSV.")
    end
  end

  private

  class Result
    attr_reader :csv_string, :error

    def initialize(csv_string: , created:, error:)
      @csv_string = csv_string
      @created = created
      @error = error
    end

    def created?
      @created
    end
  end
end
