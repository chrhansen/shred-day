class Api::V1::DaysController < ApplicationController
  before_action :set_day, only: [:show, :update, :destroy]
  before_action :set_skis, only: [:create, :update]

  # GET /api/v1/days
  def index
    days = current_user.days.includes(:skis, :resort, photos: { image_attachment: :blob }).order(date: :desc)
    # Use the specific serializer for the list view
    render json: days, each_serializer: Api::V1::DayEntrySerializer
  end

  # GET /api/v1/days/:id
  def show
    render json: @day
  end

  # POST /api/v1/days
  def create
    # Exclude photo_ids from initial build, handle association later
    day = current_user.days.build(day_params.except(:photo_ids, :ski_ids))

    if day.save
      sync_photos(day, day_params[:photo_ids] || [])
      day.skis << @skis
      # Eager load associations for the response, including photos and their blobs
      day.reload(include: [:ski, :resort, :photos])

      render json: day, status: :created
    else
      render json: { errors: day.errors }, status: :unprocessable_entity
    end
  end

  # PATCH /api/v1/days/:id
  def update
    # Update day attributes first (excluding photo_ids)
    unless @day.update(day_params.except(:photo_ids))
      render json: { errors: @day.errors }, status: :unprocessable_entity
      return # Stop execution if day update fails
    end

    # Synchronize photos if photo_ids parameter is provided
    if params[:day].key?(:photo_ids)
      sync_photos(@day, day_params[:photo_ids] || [])
    end

    @day.reload(include: [:ski, :resort, :photos])
    render json: @day # Return updated day on success (200 OK)
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

  # Helper method to synchronize photos (used by update and create)
  def sync_photos(day, incoming_photo_ids)
    incoming_photo_ids = Array(incoming_photo_ids).compact.map(&:to_s) # Ensure array of strings
    current_photo_ids = day.photos.pluck(:id).map(&:to_s)

    ids_to_add = incoming_photo_ids - current_photo_ids
    ids_to_remove = current_photo_ids - incoming_photo_ids

    if ids_to_add.present?
      photos_to_add = current_user.photos.where(id: ids_to_add, day_id: nil)
      photos_to_add.update_all(day_id: day.id)
    end

    if ids_to_remove.present?
      # Ensure we only destroy photos currently associated with *this* day
      # And also ensure they belong to the current user for security
      photos_to_destroy = day.photos.where(id: ids_to_remove).where(user_id: current_user.id)
      # Destroy the records and their attachments
      photos_to_destroy.destroy_all
    end
  end
end
