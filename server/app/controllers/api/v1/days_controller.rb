class Api::V1::DaysController < ApplicationController
  before_action :set_day, only: [:show, :update, :destroy]

  # GET /api/v1/days
  def index
    days = current_user.days.includes(:ski, :resort).order(date: :desc)
    # Use the specific serializer for the list view
    render json: days, each_serializer: Api::V1::DayEntrySerializer
  end

  # GET /api/v1/days/:id
  def show
    # Render the single day using the default DaySerializer (includes nested objects)
    render json: @day
  end

  # POST /api/v1/days
  def create
    # Build the day associated with the current_user
    # Exclude photos from initial build, we'll handle them separately
    day = current_user.days.build(day_params.except(:photos))

    if day.save
      # Attach photos if they were provided
      if day_params[:photos].present?
        day_params[:photos].each do |photo_file|
          day.photos.create!(image: photo_file)
        end
      end

      # Eager load associations for the response
      day.reload

      # Render created day using the default DaySerializer
      render json: day, status: :created
    else
      # Use a consistent error format { errors: ... }
      render json: { errors: day.errors }, status: :unprocessable_entity
    end
  end

  # PATCH /api/v1/days/:id
  def update
    if @day.update(day_params)
      # Render updated day using the default DaySerializer (includes nested objects)
      render json: @day # Return updated day on success (200 OK)
    else
      render json: { errors: @day.errors }, status: :unprocessable_entity # Return errors on failure (422)
    end
  end

  # DELETE /api/v1/days/:id
  def destroy
    if @day.destroy
      head :no_content # Return 204 No Content on success
    else
      # Handle potential destroy failures (e.g., callbacks preventing destroy)
      render json: { errors: @day.errors }, status: :unprocessable_entity
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
    # Allow an array of photos
    params.require(:day).permit(:date, :resort_id, :ski_id, :activity, photos: [])
  end
end
