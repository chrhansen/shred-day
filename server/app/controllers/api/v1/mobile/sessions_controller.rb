class Api::V1::Mobile::SessionsController < ApplicationController
  skip_before_action :require_login, only: :create
  rate_limit to: 10, within: 1.minute, only: :create,
    with: -> { render json: { error: "Too many sign-in attempts. Try again shortly." }, status: :too_many_requests }

  def create
    user = User.find_by(email: params[:email].to_s.strip.downcase)
    return invalid_credentials unless user
    user.with_lock do
      return invalid_credentials unless user.authenticate(params[:password].to_s)
      return render_email_confirmation_required unless user.password_confirmed?
      result = Mobile::CreateSessionService.new(user).create_session
      render json: session_payload(result), status: :created
    end
  end

  def destroy
    return render json: { error: "Mobile session required" }, status: :unauthorized unless current_mobile_session
    current_mobile_session.update!(revoked_at: Time.current)
    head :no_content
  end

  private

  def invalid_credentials
    render json: { error: "Invalid email or password" }, status: :unauthorized
  end

  def session_payload(result)
    { token: result.token, expires_at: result.session.expires_at,
      authentication_method: result.session.authentication_method,
      user: { id: result.session.user.id, email: result.session.user.email } }
  end
end
