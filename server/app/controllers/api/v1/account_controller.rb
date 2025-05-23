class Api::V1::AccountController < ApplicationController
  before_action :calculate_available_seasons

  def show
    render json: current_user, available_seasons: @available_seasons
  end

  def update
    if current_user.update(user_params)
      render json: current_user, available_seasons: @available_seasons
    else
      render json: { errors: current_user.errors.full_messages }, status: :unprocessable_entity
    end
  end

  private

  def user_params
    params.require(:user).permit(:email, :password, :season_start_day)
  end

  def calculate_available_seasons
    @available_seasons = AvailableSeasonsService.new(current_user).fetch_available_seasons
  end
end
