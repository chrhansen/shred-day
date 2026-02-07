class Api::V1::DashboardController < ApplicationController
  # GET /api/v1/dashboard?season=0
  def show
    season_offset = params[:season]&.to_i || 0

    result = Dashboard::FetchSeasonDashboardService.new(current_user, season_offset: season_offset).fetch_dashboard

    render json: {
      season: result.season,
      summary: result.summary,
      daysPerMonth: result.days_per_month,
      resorts: result.resorts,
      tags: result.tags,
      skis: result.skis
    }
  end
end

