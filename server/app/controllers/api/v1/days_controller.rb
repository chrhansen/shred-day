class Api::V1::DaysController < ApplicationController

  # POST /api/v1/days
  def create
    # Build the day associated with the current_user
    day = current_user.days.build(day_params)

    if day.save
      render json: day, status: :created # Return created day on success (201)
    else
      render json: day.errors, status: :unprocessable_entity # Return errors on failure (422)
    end
  end

  private

  # Strong parameters: only allow permitted attributes
  def day_params
    params.require(:day).permit(:date, :resort, :ski_id, :activity)
  end
end
