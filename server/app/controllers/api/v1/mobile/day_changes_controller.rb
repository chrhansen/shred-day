class Api::V1::Mobile::DayChangesController < ApplicationController
  def create
    attributes = params.fetch(:day, ActionController::Parameters.new).permit(
      :date, :resort_id, :notes, photo_ids: [], ski_ids: [], tag_ids: [])
    result = Mobile::SyncDayService.new(current_user,
      operation_id: params[:operation_id], action: params[:action_type],
      day_id: params[:day_id], version: params[:version], attributes: attributes.to_h.symbolize_keys).sync_day
    render json: result.body, status: result.status
  end
end
