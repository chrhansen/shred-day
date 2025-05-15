class Api::V1::PhotoImportsController < ApplicationController
  def create
    photo_import = current_user.photo_imports.includes(:photos).create

    render json: photo_import,
      serializer: Api::V1::PhotoImportSerializer,
      include: ['draft_days', 'draft_days.photos', 'draft_days.resort']
  end

  def show
    photo_import = current_user.photo_imports.includes(
      photos: { image_attachment: :blob },
      draft_days: { photos: { image_attachment: :blob } })
      .order('draft_days.date DESC')
      .find(params[:id])

    render json: photo_import,
      serializer: Api::V1::PhotoImportSerializer,
      include: ['photos.resort', 'draft_days', 'draft_days.photos', 'draft_days.resort', 'draft_days.photos.resort']
  end

  def update
    photo_import = current_user.photo_imports.find(params[:id])
    result = PhotoImportUpdateService.new(photo_import, photo_import_params).update_photo_import

    if result.updated?
      render json: photo_import, serializer: Api::V1::PhotoImportSerializer
    else
      render json: { error: result.error }, status: :unprocessable_entity
    end
  end

  private

  def photo_import_params
    params.require(:photo_import).permit(:status)
  end
end
