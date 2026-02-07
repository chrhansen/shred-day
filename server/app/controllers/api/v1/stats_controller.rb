class Api::V1::StatsController < ApplicationController
  def show
    season_offset = params[:season]&.to_i || 0
    result = Stats::FetchSeasonStatsService
      .new(current_user, season_offset: season_offset)
      .fetch_stats

    most_used_ski_name = result.skis.max_by { |row| row[:days].to_i }&.dig(:name) || "-"

    render json: {
      totalDays: result.summary[:totalDays],
      uniqueResorts: result.summary[:uniqueResorts],
      mostUsedSki: most_used_ski_name,
      season: result.season,
      summary: result.summary,
      daysPerMonth: result.days_per_month,
      resorts: result.resorts,
      tags: result.tags,
      skis: result.skis
    }
  end
end
