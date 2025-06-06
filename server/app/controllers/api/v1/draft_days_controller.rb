class Api::V1::DraftDaysController < ApplicationController
  def update
    # Find draft day through either photo_import or text_import
    draft_day = find_draft_day(params[:id])
    
    unless draft_day
      render json: { error: "Draft day not found" }, status: :not_found
      return
    end

    draft_day.update(draft_day_params)

    if draft_day.valid?
      render json: draft_day, serializer: Api::V1::DraftDaySerializer
    else
      render json: { errors: draft_day.errors }, status: :unprocessable_entity
    end
  end

  private

  def draft_day_params
    params.require(:draft_day).permit(:decision, :date, :resort_id)
  end

  def find_draft_day(draft_day_id)
    # Try to find through photo_imports first
    photo_import_draft = current_user.photo_imports
      .joins(:draft_days)
      .where(draft_days: { id: draft_day_id })
      .first&.draft_days&.find_by(id: draft_day_id)
    
    return photo_import_draft if photo_import_draft

    # Try to find through text_imports
    text_import_draft = current_user.text_imports
      .joins(:draft_days)
      .where(draft_days: { id: draft_day_id })
      .first&.draft_days&.find_by(id: draft_day_id)
    
    text_import_draft
  end
end
