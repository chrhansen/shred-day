class Api::V1::DaysController < ApplicationController

  # GET /api/v1/days
  def index
    days = current_user.days.includes(:ski, :resort).order(date: :desc)
    render json: days, each_serializer: Api::V1::DaySerializer # Use the new serializer
  end

  # POST /api/v1/days
  def create
    # Build the day associated with the current_user
    # The 'resort_id' from params will automatically link to the Resort
    # because of the 'belongs_to :resort' association in the Day model.
    day = current_user.days.build(day_params)

    if day.save
      # Return the full day object, which will include associated resort details via the serializer (if configured)
      render json: day, status: :created # Return created day on success (201)
    else
      render json: day.errors, status: :unprocessable_entity # Return errors on failure (422)
    end
  end

  private

  # Strong parameters: only allow permitted attributes
  def day_params
    params.require(:day).permit(:date, :resort_id, :ski_id, :activity)
  end
end
