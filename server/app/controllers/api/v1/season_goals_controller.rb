class Api::V1::SeasonGoalsController < ApplicationController
  DEFAULT_SEASON_GOAL_DAYS = Dashboard::FetchSeasonDashboardService::DEFAULT_SEASON_GOAL_DAYS

  # GET /api/v1/season_goals/:id (id = season_start_year)
  def show
    year = params[:id].to_i
    goal = current_user.season_goals.find_by(season_start_year: year)

    render json: {
      seasonStartYear: year,
      goalDays: goal&.goal_days || DEFAULT_SEASON_GOAL_DAYS
    }
  end

  # PATCH /api/v1/season_goals/:id (id = season_start_year)
  def update
    year = params[:id].to_i
    goal = current_user.season_goals.find_or_initialize_by(season_start_year: year)
    goal.goal_days = season_goal_params[:goal_days]

    if goal.save
      render json: { seasonStartYear: goal.season_start_year, goalDays: goal.goal_days }, status: :ok
    else
      render json: { errors: goal.errors }, status: :unprocessable_entity
    end
  end

  private

  def season_goal_params
    params.require(:season_goal).permit(:goal_days)
  end
end

