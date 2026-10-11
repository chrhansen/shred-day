class ApplicationController < ActionController::API
  # Include cookie methods needed for session management
  include ActionController::Cookies

  # Apply require_login globally to all inheriting controllers
  before_action :require_login

  # Helper method to find the current user based on session
  def current_user
    return @current_user if defined?(@current_user)
    @current_user = if request.headers['Authorization'].present?
      current_mobile_session&.user
    elsif session[:user_id]
      User.find_by(id: session[:user_id])
    end
  end

  def current_mobile_session
    return @current_mobile_session if defined?(@current_mobile_session)
    authorization = request.headers['Authorization'].to_s
    token = authorization.match(/\ABearer ([A-Za-z0-9_-]+)\z/i)&.captures&.first
    @current_mobile_session = MobileSession.find_by_token(token)
  end

  # Helper method to check if a user is logged in
  def logged_in?
    !!current_user # Double bang converts the result to a boolean
  end

  # Before action filter to require login for certain actions
  def require_login
    unless logged_in?
      render json: { error: 'You must be logged in to access this section' }, status: :unauthorized
    end
  end
end
