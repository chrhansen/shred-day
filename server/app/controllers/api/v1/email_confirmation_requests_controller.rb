class Api::V1::EmailConfirmationRequestsController < ApplicationController
  skip_before_action :require_login
  rate_limit to: 10, within: 1.hour,
    with: -> { render json: { error: "Too many confirmation requests. Try again later." }, status: :too_many_requests }

  def create
    Users::EmailConfirmationService.new.request_confirmation(params[:email])
    render json: { message: "If this address can use password sign-in, we’ll send a confirmation link." }, status: :accepted
  end
end
