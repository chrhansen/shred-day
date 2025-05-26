class Api::V1::DaysController < ApplicationController
  before_action :set_day, only: [:show, :update, :destroy]
  before_action :set_skis, only: [:create, :update]

  # GET /api/v1/days
  def index
    days = Days::IndexDayService.new(current_user, params).fetch_days

    render json: days, each_serializer: Api::V1::DayEntrySerializer
  end

  # GET /api/v1/days/:id
  def show
    render json: @day
  end

  # POST /api/v1/days
  def create
    result = Days::CreateDayService.new(current_user, day_params.except(:photo_ids, :ski_ids)).create_day

    if result.created?
      Days::SyncPhotosService.new(result.day, day_params[:photo_ids]).sync_photos
      result.day.skis << @skis
      result.day.reload(include: [:ski, :resort, :photos])

      render json: result.day, status: :created
    else
      render json: { errors: result.day.errors }, status: :unprocessable_entity
    end
  end

  # PATCH /api/v1/days/:id
  def update
    result = Days::UpdateDayService.new(@day, day_params.except(:photo_ids)).update_day

    if result.updated?
      Days::SyncPhotosService.new(result.day, day_params[:photo_ids]).sync_photos
      result.day.reload(include: [:ski, :resort, :photos])

      render json: result.day, status: :ok
    else
      render json: { errors: @day.errors }, status: :unprocessable_entity
    end
  end

  # DELETE /api/v1/days/:id
  def destroy
    date = @day.date
    if @day.destroy
      DayNumberUpdaterService.new(user:current_user, affected_dates: [date]).update!

      head :no_content # Return 204 No Content on success
    else
      # Handle potential destroy failures (e.g., callbacks preventing destroy)
      render json: { errors: @day.errors }, status: :unprocessable_entity
    end
  end

  private

  def set_skis
    @skis = []
    if day_params[:ski_ids] && day_params[:ski_ids].any?
      @skis = current_user.skis.find(day_params[:ski_ids])
    end
  rescue ActiveRecord::RecordNotFound
    render json: { errors: { ski_ids: ['One or more skis not found'] } }, status: :unprocessable_entity
  end

  def set_day
    @day = current_user.days.includes(:skis, :resort, :photos).find(params[:id])
    # Preload associations and photo attachments
    # Use attachment names for eager loading
  rescue ActiveRecord::RecordNotFound
    render json: { error: 'Day not found' }, status: :not_found
  end

  # Strong parameters: permit attributes for create and update
  def day_params
    # Allow an array of photo_ids instead of photo files
    params.require(:day).permit(
      :date, :resort_id, :activity, :notes, photo_ids: [], ski_ids: []
    )
  end
end
