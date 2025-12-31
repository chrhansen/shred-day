class Api::V1::SharedDaysController < ApplicationController
  skip_before_action :require_login, only: [:show]

  def show
    result = Days::FindSharedDayService.new(params[:id]).find_shared_day

    if result.found?
      render json: result.day, serializer: Api::V1::SharedDaySerializer
    else
      render json: { error: 'Day not found' }, status: :not_found
    end
  end

  def create
    day = current_user.days.find(shared_day_params[:day_id])
    result = Days::ShareDayService.new(day).enable_sharing

    if result.updated?
      render json: result.day, status: :ok
    else
      render json: { errors: result.errors }, status: :unprocessable_entity
    end
  end

  def destroy
    day = current_user.days.find(params[:id])
    result = Days::ShareDayService.new(day).disable_sharing

    if result.updated?
      render json: result.day, status: :ok
    else
      render json: { errors: result.errors }, status: :unprocessable_entity
    end
  end

  private

  def shared_day_params
    params.require(:shared_day).permit(:day_id)
  end
end
