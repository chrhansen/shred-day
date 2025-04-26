class Api::V1::DaysController < ApplicationController
  before_action :set_day, only: [:show, :update] # Add before_action

  # GET /api/v1/days
  def index
    days = current_user.days.includes(:ski, :resort).order(date: :desc)
    render json: days, each_serializer: Api::V1::DaySerializer # Use the new serializer
  end

  # GET /api/v1/days/:id
  def show
    # @day is set by before_action
    # Render the single day, including associations via serializer
    render json: @day # Assuming serializer handles associations
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
      # Use a consistent error format { errors: ... }
      render json: { errors: day.errors }, status: :unprocessable_entity # Return errors on failure (422)
    end
  end

  # PATCH /api/v1/days/:id
  def update
    # @day is set by before_action
    if @day.update(day_params)
      render json: @day # Return updated day on success (200 OK)
    else
      render json: { errors: @day.errors }, status: :unprocessable_entity # Return errors on failure (422)
    end
  end

  private

  # Add set_day method to find the day and handle not found
  def set_day
    @day = current_user.days.includes(:ski, :resort).find(params[:id])
  rescue ActiveRecord::RecordNotFound
    render json: { error: 'Day not found' }, status: :not_found
  end

  # Strong parameters: permit attributes for create and update
  def day_params
    params.require(:day).permit(:date, :resort_id, :ski_id, :activity)
  end
end
