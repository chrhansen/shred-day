class Api::V1::PhotosController < ApplicationController
  before_action :set_photo, only: [:destroy]

  def create
    photo = current_user.photos.build

    if params[:file].present? && photo.image.attach(params[:file]) && photo.save
      ExifExtractService.new(photo).extract_from_file
      SetNearestResortService.new(photo).set_nearest_resort

      render json: photo, status: :created, serializer: Api::V1::PhotoSerializer
    else
      error_message = photo.errors.full_messages.presence || ["Failed to attach or save file."]
      error_message = ["No file provided."] if params[:file].blank?
      render json: { errors: error_message }, status: :unprocessable_entity
    end
  end

  def destroy
    if @photo.destroy
      head :no_content
    else
      render json: { errors: @photo.errors.full_messages }, status: :unprocessable_entity
    end
  end

  private

  def set_photo
    @photo = current_user.photos.find_by(id: params[:id])
    unless @photo
      render json: { error: "Photo not found or access denied" }, status: :not_found
    end
  end
end
