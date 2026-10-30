class Api::V1::PasswordResetRequestsController < ApplicationController
  skip_before_action :require_login
  rate_limit to: 10, within: 1.hour,
    with: -> { render json: { error: "Too many password reset requests. Try again later." }, status: :too_many_requests }

  def create
    response.headers["Cache-Control"] = "no-store"
    Users::PasswordResetService.new.request_reset(params[:email])
    render json: { message: Users::PasswordResetService::REQUEST_MESSAGE }, status: :accepted
  end
end
