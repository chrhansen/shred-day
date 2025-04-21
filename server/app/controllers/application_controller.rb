class ApplicationController < ActionController::API
  # Include cookie methods needed for session management
  include ActionController::Cookies

  # Apply require_login globally to all inheriting controllers
  before_action :require_login

  # Helper method to find the current user based on session
  def current_user
    # Use memoization (@current_user ||= ...) to avoid multiple DB lookups per request
    @current_user ||= User.find_by(id: session[:user_id]) if session[:user_id]
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
