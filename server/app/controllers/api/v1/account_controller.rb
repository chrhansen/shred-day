class Api::V1::AccountController < ApplicationController
  def show
    render json: current_user, available_seasons: calculate_available_seasons
  end

  def update
    result = AccountUpdateService.new(current_user, user_params).update

    if result.updated?
      render json: current_user, available_seasons: calculate_available_seasons
    else
      render json: { errors: result.errors }, status: :unprocessable_entity
    end
  end

  private

  def user_params
    params.require(:user).permit(:email, :password, :season_start_day, :username, :avatar)
  end

  def calculate_available_seasons
    AvailableSeasonsService.new(current_user).fetch_available_seasons
  end
end
