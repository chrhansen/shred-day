class Api::V1::UsersController < ApplicationController
  # Skip login requirement for the create action (sign-up)
  skip_before_action :require_login, only: [ :create ]
  rate_limit to: 10, within: 1.hour, only: :create,
    with: -> { render json: { error: "Too many signup attempts. Try again later." }, status: :too_many_requests }

  # POST /api/v1/users
  def create
    result = Users::CreateUserService.new(user_params).create_user

    if result.created?
      render json: { confirmation_required: true, message: Users::EmailConfirmationService::MESSAGE }, status: :created
    else
      render json: { errors: result.errors }, status: :unprocessable_content
    end
  end

  private

  def user_params
    # Require the user object and permit only the necessary parameters
    params.require(:user).permit(:email, :password)
  end
end
