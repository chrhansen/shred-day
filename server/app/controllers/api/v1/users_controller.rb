class Api::V1::UsersController < ApplicationController
  # Skip login requirement for the create action (sign-up)
  skip_before_action :require_login, only: [:create]

  # POST /api/v1/users
  def create
    user = User.new(user_params)

    if user.save
      # Establish session immediately after sign up
      session[:user_id] = user.id
      # Exclude password_digest from the response for security
      render json: user.as_json(except: :password_digest), status: :created
    else
      render json: { errors: user.errors.full_messages }, status: :unprocessable_entity
    end
  end

  private

  def user_params
    # Require the user object and permit only the necessary parameters
    params.require(:user).permit(:email, :password, :password_confirmation)
  end
end
