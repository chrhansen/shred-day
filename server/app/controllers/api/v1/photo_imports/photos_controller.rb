# app/controllers/api/v1/photo_imports/photos_controller.rb
class Api::V1::PhotoImports::PhotosController < ApplicationController
  before_action :set_photo_import
  before_action :set_photo, only: [:destroy, :update]

  def create
    result = PhotoCreateService.new(@photo_import, params).create_photo

    if result.created?
      render json: result.photo, status: :created, serializer: Api::V1::PhotoSerializer
    else
      render json: { errors: result.photo.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def update
    result = PhotoUpdateService.new(@photo, photo_params).update_photo

    if result.updated?
      render json: @photo, status: :ok, serializer: Api::V1::PhotoSerializer
    else
      render json: { errors: @photo.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def destroy
    result = PhotoDestroyService.new(@photo).destroy_photo

    if result.destroyed?
      head :no_content
    else
      render json: { errors: @photo.errors.full_messages }, status: :unprocessable_entity
    end
  end

  private

  def set_photo
    @photo = @photo_import.photos.find_by(id: params[:id])
    unless @photo
      render json: { error: "Photo not found or access denied" }, status: :not_found
    end
  end

  def set_photo_import
    @photo_import = current_user.photo_imports.find(params[:photo_import_id])
  rescue ActiveRecord::RecordNotFound
    render json: { error: "PhotoImport not found" }, status: :not_found
  end

  def photo_params
    params.require(:photo).permit(:taken_at, :resort_id)
  end
end
