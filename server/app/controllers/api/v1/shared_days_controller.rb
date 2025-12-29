class Api::V1::SharedDaysController < ApplicationController
  skip_before_action :require_login, only: [:show]

  def show
    result = Days::FindSharedDayService.new(params[:id]).find_shared_day

    if result.found?
      render json: result.day, serializer: Api::V1::SharedDaySerializer
    else
      render json: { error: 'Day not found' }, status: :not_found
    end
  end
end
