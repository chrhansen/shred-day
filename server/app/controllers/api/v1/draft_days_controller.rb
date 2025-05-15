class Api::V1::DraftDaysController < ApplicationController
  def update
    draft_day = current_user.draft_days.find(params[:id])
    draft_day.update(draft_day_params)

    if draft_day.valid?
      render json: draft_day
    else
      render json: { errors: draft_day.errors }, status: :unprocessable_entity
    end
  end

  private

  def draft_day_params
    params.require(:draft_day).permit(:decision)
  end
end
