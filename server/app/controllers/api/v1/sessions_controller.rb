class Api::V1::SessionsController < ApplicationController
  # Skip login requirement only for the sign-in action
  skip_before_action :require_login, only: [:create]

  # POST /api/v1/sessions (Sign In)
  def create
    user = User.find_by(email: params[:email].strip.downcase)

    # `authenticate` method comes from `has_secure_password`
    if user&.authenticate(params[:password])
      # Store user ID in session - Rails handles secure cookie management
      session[:user_id] = user.id
      render json: { message: 'Signed in successfully', user: user.as_json(except: :password_digest) }, status: :ok
    else
      render json: { error: 'Invalid email or password' }, status: :unauthorized
    end
  end

  # DELETE /api/v1/sessions (Sign Out)
  def destroy
    session[:user_id] = nil
    render json: { message: 'Signed out successfully' }, status: :ok
  end
end
