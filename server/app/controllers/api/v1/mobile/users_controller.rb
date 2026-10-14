class Api::V1::Mobile::UsersController < Api::V1::Mobile::SessionsController
  skip_before_action :require_login, only: :create
  rate_limit to: 10, within: 1.hour, only: :create, name: "signup",
    with: -> { render json: { error: "Too many signup attempts. Try again later." }, status: :too_many_requests }

  def create
    result = Users::CreateUserService.new(params.require(:user).permit(:email, :password)).create_user
    if result.created?
      render json: { confirmation_required: true, message: Users::EmailConfirmationService::MESSAGE }, status: :created
    else
      render json: { errors: result.errors }, status: :unprocessable_content
    end
  end
end
