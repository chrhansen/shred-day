class Stats::FetchSeasonStatsService
  def initialize(user, season_offset:)
    @user = user
    @season_offset = season_offset.to_i
    @converter = OffsetDateRangeConverterService.new(@user.season_start_day)
  end

  def fetch_stats
    start_date, end_date = @converter.date_range(@season_offset)
    days = @user.days.where(date: start_date..end_date)

    Result.new(
      fetched: true,
      season: season_payload(@season_offset, start_date, end_date),
      summary: summary_payload(days),
      days_per_month: days_per_month_payload(days),
      resorts: resorts_payload(days),
      tags: tags_payload(days),
      skis: skis_payload(days)
    )
  end

  private

  def season_payload(offset, start_date, end_date)
    {
      offset: offset,
      startDate: start_date.to_s,
      endDate: end_date.to_s,
      startYear: start_date.year,
      endYear: end_date.year
    }
  end

  def summary_payload(days_relation)
    dates_desc = days_relation.select(:date).distinct.order(date: :desc).pluck(:date)

    total_days = days_relation.count
    unique_resorts = days_relation.select(:resort_id).distinct.count

    {
      totalDays: total_days,
      uniqueResorts: unique_resorts,
      currentStreak: calculate_streak(dates_desc)
    }
  end

  def calculate_streak(dates_desc)
    return 0 if dates_desc.empty?

    streak = 1
    dates_desc.each_cons(2) do |current_date, next_date|
      if next_date == current_date - 1.day
        streak += 1
      else
        break
      end
    end

    streak
  end

  def days_per_month_payload(days_relation)
    counts = days_relation.group(Arel.sql("EXTRACT(MONTH FROM days.date)")).count
    counts
      .map { |month_number, count| [month_number.to_i, count] }
      .sort_by(&:first)
      .map do |month_number, count|
        abbr = Date::ABBR_MONTHNAMES[month_number]
        next if abbr.nil?

        { month: abbr, days: count }
      end
      .compact
  end

  def resorts_payload(days_relation)
    rows = days_relation
      .joins(:resort)
      .group("resorts.id", "resorts.name", "resorts.latitude", "resorts.longitude", "resorts.country")
      .order(Arel.sql("COUNT(days.id) DESC"))
      .pluck(
        "resorts.name",
        "resorts.country",
        "resorts.latitude",
        "resorts.longitude",
        Arel.sql("COUNT(days.id)")
      )

    rows.map do |name, country, latitude, longitude, days_skied|
      {
        name: name,
        country: country,
        latitude: latitude,
        longitude: longitude,
        daysSkied: days_skied.to_i
      }
    end
  end

  def tags_payload(days_relation)
    counts = days_relation.joins(:tags).group("tags.name").count

    counts
      .map { |name, count| { name: name, count: count } }
      .sort_by { |row| -row[:count] }
  end

  def skis_payload(days_relation)
    counts = days_relation.joins(:skis).group("skis.name").count

    counts
      .map { |name, count| { name: name, days: count } }
      .sort_by { |row| -row[:days] }
  end

  class Result
    attr_reader :season, :summary, :days_per_month, :resorts, :tags, :skis

    def initialize(fetched:, season:, summary:, days_per_month:, resorts:, tags:, skis:)
      @fetched = fetched
      @season = season
      @summary = summary
      @days_per_month = days_per_month
      @resorts = resorts
      @tags = tags
      @skis = skis
    end

    def fetched?
      @fetched
    end
  end
end

