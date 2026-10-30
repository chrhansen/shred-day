class Api::V1::PasswordResetsController < ApplicationController
  skip_before_action :require_login
  rate_limit to: 20, within: 1.minute,
    with: -> { render json: { error: "Too many password reset attempts. Try again shortly." }, status: :too_many_requests }

  def create
    response.headers["Cache-Control"] = "no-store"
    result = Users::PasswordResetService.new.reset_password(token: params[:token], password: params[:password],
      password_confirmation: params[:password_confirmation])
    if result.reset?
      render json: { message: "Your password has been reset. Sign in with your new password." }
    else
      render json: result.errors ? { errors: result.errors } : { error: result.error }, status: :unprocessable_content
    end
  end
end
