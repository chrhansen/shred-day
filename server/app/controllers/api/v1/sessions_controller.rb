class Api::V1::SessionsController < ApplicationController
  skip_before_action :require_login, only: [ :create, :destroy ]
  rate_limit to: 10, within: 1.minute, only: :create,
    with: -> { render json: { error: "Too many sign-in attempts. Try again shortly." }, status: :too_many_requests }

  # POST /api/v1/sessions (Sign In)
  def create
    user = User.find_by(email: params[:email].to_s.strip.downcase)

    return invalid_credentials unless user
    user.with_lock do
      return invalid_credentials unless user.authenticate(params[:password].to_s)
      return render_email_confirmation_required unless user.password_confirmed?
      session[:user_id] = user.id
      session[:authentication_method] = "password"
      session[:password_session_version] = user.password_session_version
      render json: { message: "Signed in successfully", user: user.authentication_payload }, status: :ok
    end
  end

  # DELETE /api/v1/sessions (Sign Out)
  def destroy
    reset_session
    render json: { message: "Signed out successfully" }, status: :ok
  end

  private

  def invalid_credentials
    render json: { error: "Invalid email or password" }, status: :unauthorized
  end
end
