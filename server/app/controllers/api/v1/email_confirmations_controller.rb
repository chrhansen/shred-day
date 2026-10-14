class Api::V1::EmailConfirmationsController < ApplicationController
  skip_before_action :require_login
  rate_limit to: 20, within: 1.minute,
    with: -> { render json: { error: "Too many confirmation attempts. Try again shortly." }, status: :too_many_requests }

  def create
    result = Users::EmailConfirmationService.new.confirm(token: params[:token], password: params[:password],
      password_confirmation: params[:password_confirmation])
    if result.confirmed?
      render json: { message: "Email confirmed. You can now sign in with your password." }
    else
      render json: result.errors ? { errors: result.errors } : { error: result.error }, status: :unprocessable_content
    end
  end
end
