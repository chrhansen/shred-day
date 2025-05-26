class DayNumberUpdaterService
  def initialize(user:, affected_dates:)
    @user = user

    @affected_dates = affected_dates.compact.uniq # Remove nils and duplicates
  end

  def update!
    season_starts = @affected_dates.map { |date| season_cutoff_for_date(date) }.compact.uniq

    season_starts.each do |season_start|
      reorder_for_season(season_start)
    end
  end

  private

  def reorder_for_season(season_start)
    season_end = season_start + 1.year - 1.day

    ActiveRecord::Base.transaction do
      ski_days = @user.days
                      .where(date: season_start..season_end)
                      .order(:date, :created_at)
                      .lock

      return if ski_days.empty?

      case_statements = ski_days.each.with_index(1).map do |day, index|
        "WHEN '#{day.id}' THEN #{index}"
      end.join(' ')

      ids = ski_days.map { |d| "'#{d.id}'" }.join(',')

      sql = <<~SQL
        UPDATE days
        SET day_number = CASE id #{case_statements} END
        WHERE id IN (#{ids})
      SQL

      ActiveRecord::Base.connection.execute(sql)
    end
  end

  def season_cutoff_for_date(date)
    month, day = @user.season_start_day.split('-').map(&:to_i)
    potential_cutoff = Date.new(date.year, month, day) rescue nil
    return nil unless potential_cutoff

    date < potential_cutoff ? potential_cutoff.prev_year : potential_cutoff
  end
end
