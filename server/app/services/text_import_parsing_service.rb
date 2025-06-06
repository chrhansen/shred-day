# This service parses text content from a text import and creates draft days
# by extracting dates and resort names from each line of text. It follows a
# similar pattern to photo imports, but instead of extracting EXIF data, it
# parses text to find dates and resort names.
class TextImportParsingService
  def initialize(text_import, season_offset = nil)
    @text_import = text_import
    @user = text_import.user
    @season_offset = season_offset || 0
    @offset_converter = OffsetDateRangeConverterService.new(@user.season_start_day)
  end

  def parse_and_create_draft_days
    unless @text_import.original_text.present?
      return Result.new(parsed: false, text_import: @text_import, error: "No text content to parse")
    end

    begin
      @text_import.status_processing!

      # Normalize line endings to handle both \r\n and \n, then strip whitespace
      lines = @text_import.original_text.gsub(/\r\n?/, "\n").split("\n").map(&:strip).reject(&:blank?)
      draft_days_created = 0
      errors = []

      lines.each_with_index do |line, index|
        begin
          # Ensure line has valid UTF-8 encoding
          line = line.force_encoding('UTF-8') unless line.encoding == Encoding::UTF_8
          unless line.valid_encoding?
            line = line.encode('UTF-8', invalid: :replace, undef: :replace, replace: '?')
          end
          
          parsed_data = parse_line(line)
          
          if parsed_data[:date].present? && parsed_data[:resort_name].present?
            resort = find_resort(parsed_data[:resort_name])

            if resort
              draft_day = create_draft_day(parsed_data[:date], resort, line)
              if draft_day.persisted?
                draft_days_created += 1
              else
                errors << "Line #{index + 1}: Failed to create draft day - #{draft_day.errors.full_messages.join(', ')}"
              end
            else
              errors << "Line #{index + 1}: Could not find matching resort for '#{parsed_data[:resort_name]}'"
            end
          elsif parsed_data[:date].blank?
            errors << "Line #{index + 1}: No valid date found"
          elsif parsed_data[:resort_name].blank?
            errors << "Line #{index + 1}: No resort name found"
          end
        rescue StandardError => e
          errors << "Line #{index + 1}: Error processing line - #{e.message}"
          Rails.logger.error "TextImportParsingService: Error on line #{index + 1}: #{e.message}"
          Rails.logger.error e.backtrace.join("\n")
        end
      end

      # Update status based on results
      if draft_days_created > 0 && errors.empty?
        @text_import.status_waiting!
        Result.new(parsed: true, text_import: @text_import, draft_days_count: draft_days_created)
      elsif draft_days_created > 0 && errors.present?
        @text_import.status_waiting!
        Result.new(parsed: true, text_import: @text_import, draft_days_count: draft_days_created,
                  error: "Imported #{draft_days_created} days with #{errors.size} errors: #{errors.join('; ')}")
      else
        @text_import.status_failed!
        Result.new(parsed: false, text_import: @text_import, error: errors.join('; '))
      end
    rescue StandardError => e
      @text_import.status_failed!
      Result.new(parsed: false, text_import: @text_import, error: "Parsing failed: #{e.message}")
    end
  end

  private

  def parse_line(line)
    # Extract date and resort name from a line of text
    # Try multiple date formats and patterns
    date = extract_date(line)
    resort_name = extract_resort_name(line, date)

    { date: date, resort_name: resort_name }
  end

  def extract_date(line)
    # First try patterns with explicit years
    date_patterns_with_year = [
      # ISO format: 2024-01-15
      /(\d{4}-\d{1,2}-\d{1,2})/,
      # European format: 15/01/2024 or 15.01.2024
      /(\d{1,2}[\/\.]\d{1,2}[\/\.]\d{4})/,
      # American format: 01/15/2024 or 01.15.2024
      /(\d{1,2}[\/\.]\d{1,2}[\/\.]\d{4})/,
      # Month name formats: Jan 15, 2024 or 15 Jan 2024
      /(\w{3,}\s+\d{1,2},?\s+\d{4})/,
      /(\d{1,2}\s+\w{3,}\s+\d{4})/
    ]

    # Try patterns with explicit years first
    date_patterns_with_year.each do |pattern|
      if match = line.match(pattern)
        begin
          parsed_date = Date.parse(match[1])
          # Only accept dates that make sense for skiing (not in the future, not too far in the past)
          if parsed_date <= Date.today && parsed_date > Date.today - 50.years
            return parsed_date
          end
        rescue Date::Error
          next
        end
      end
    end

    # If no year found, try patterns without year and use the season offset
    date_patterns_without_year = [
      # Month day formats: Jan 15 or 15 Jan or January 15
      # Also handles "Sep. 21", "Oct. 6" etc
      /(\w{3,}\.?\s+\d{1,2})(?!,?\s*\d{4})/,
      /(\d{1,2}\s+\w{3,})(?!\s+\d{4})/,
      # Month/day formats: 01/15 or 1/15 or 15.01
      /^(\d{1,2}[\/\.]\d{1,2})(?![\/\.]\d)/
    ]

    date_patterns_without_year.each do |pattern|
      if match = line.match(pattern)
        begin
          # Get the season date range based on offset
          season_start, season_end = @offset_converter.date_range(@season_offset)

          # Try to parse with the season's year
          date_str_with_year = "#{match[1]} #{season_start.year}"
          parsed_date = Date.parse(date_str_with_year)

          # Check if date falls within the season range
          if parsed_date >= season_start && parsed_date <= season_end
            return parsed_date
          elsif parsed_date < season_start
            # If date is before season start, it might belong to the next calendar year
            # (e.g., Jan date in a season that starts in Sept)
            date_str_with_next_year = "#{match[1]} #{season_start.year + 1}"
            parsed_date_next_year = Date.parse(date_str_with_next_year)
            if parsed_date_next_year <= season_end
              return parsed_date_next_year
            end
          end
        rescue Date::Error
          next
        end
      end
    end

    nil
  end

  def extract_resort_name(line, date)
    # Remove the date from the line to avoid confusion
    cleaned_line = line
    if date
      # Remove the date string from the line
      date_patterns = [
        date.strftime("%Y-%m-%d"),
        date.strftime("%-d/%-m/%Y"),
        date.strftime("%-m/%-d/%Y"),
        date.strftime("%d.%m.%Y"),
        date.strftime("%B %-d, %Y"),
        date.strftime("%-d %B %Y"),
        date.strftime("%b %-d, %Y"),
        date.strftime("%-d %b %Y"),
        # Also remove month-day patterns without year
        date.strftime("%b %-d"),
        date.strftime("%-d %b"),
        date.strftime("%B %-d"),
        date.strftime("%-d %B"),
        date.strftime("%b\\.? %-d"),
        date.strftime("%-d %b\\.")
      ]

      date_patterns.each do |date_str|
        cleaned_line = cleaned_line.gsub(/#{Regexp.escape(date_str)}/i, ' ')
      end
    end

    # Return the cleaned line for resort matching
    # The find_resort method will handle the complex extraction and matching
    cleaned_line.strip
  end

  def find_resort(resort_name_or_line)
    return nil if resort_name_or_line.blank?

    # First, try to extract potential resort names from the line
    candidates = ResortNameNormalizerService.extract_potential_resort_names(resort_name_or_line)

    # Add the original input as a candidate too
    candidates << resort_name_or_line.strip unless resort_name_or_line.strip.in?(candidates)

    # Try to find a match for each candidate, starting with the longest ones
    candidates.sort_by(&:length).reverse.each do |candidate|
      next if candidate.length < 3

      # Try exact match first (case insensitive)
      resort = Resort.where('LOWER(name) = LOWER(?)', candidate).first
      return resort if resort

      # Try fuzzy match
      resort = Resort.best_match(candidate, threshold: 0.4)
      return resort if resort
    end

    # If no individual candidate worked, try searching with all terms
    resort = Resort.search_by_terms(candidates, threshold: 0.3).first
    return resort if resort

    # If still no match, try with a lower threshold
    candidates.each do |candidate|
      next if candidate.length < 4
      resort = Resort.best_match(candidate, threshold: 0.25)
      return resort if resort
    end

    # No resort found
    nil
  end

  def create_draft_day(date, resort, original_text)
    # First check if a draft day already exists for this date/resort
    draft_day = @text_import.draft_days.find_by(date: date, resort: resort)
    
    # If it exists, just return it (don't create duplicates)
    return draft_day if draft_day

    # Create new draft day
    draft_day = @text_import.draft_days.build(
      date: date,
      resort: resort,
      original_text: original_text
    )

    # Check if there's already a matching day for this user
    existing_day = @user.days.find_by(date: date, resort_id: resort.id)
    if existing_day
      draft_day.day = existing_day
      draft_day.decision = :merge
    else
      draft_day.decision = :duplicate
    end

    draft_day.save!
    draft_day
  end

  class Result
    attr_reader :text_import, :error, :draft_days_count

    def initialize(parsed:, text_import:, error: nil, draft_days_count: 0)
      @parsed = parsed
      @text_import = text_import
      @error = error
      @draft_days_count = draft_days_count
    end

    def parsed?
      @parsed
    end
  end
end
