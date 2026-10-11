class Api::V1::Mobile::UsersController < Api::V1::Mobile::SessionsController
  skip_before_action :require_login, only: :create

  def create
    result = Users::CreateUserService.new(params.require(:user).permit(:email, :password)).create_user
    if result.created?
      render json: session_payload(Mobile::CreateSessionService.new(result.user).create_session), status: :created
    else
      render json: { errors: result.errors }, status: :unprocessable_content
    end
  end
end
