class ApplicationController < ActionController::API
  # Include cookie methods needed for session management
  include ActionController::Cookies

  # Apply require_login globally to all inheriting controllers
  before_action :require_login

  # Helper method to find the current user based on session
  def current_user
    return @current_user if defined?(@current_user)
    if request.headers["Authorization"].present?
      mobile_session = current_mobile_session
      @current_user = authenticated_user(mobile_session&.user, mobile_session&.authentication_method,
        mobile_session&.password_session_version,
        auth_identity_id: mobile_session&.auth_identity_id)
    elsif session[:user_id]
      user = User.find_by(id: session[:user_id])
      @current_user = authenticated_user(user, session[:authentication_method], session[:password_session_version],
        auth_identity_id: session[:auth_identity_id])
    else
      @current_user = nil
    end
  end

  def current_mobile_session
    return @current_mobile_session if defined?(@current_mobile_session)
    authorization = request.headers["Authorization"].to_s
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
      if @email_confirmation_required
        render_email_confirmation_required(status: :unauthorized)
      else
        render json: { error: "You must be logged in to access this section" }, status: :unauthorized
      end
    end
  end

  def render_email_confirmation_required(status: :forbidden)
    render json: { error: "Confirm your email address before signing in with a password.",
      code: "email_confirmation_required", confirmation_required: true }, status: status
  end

  private

  def authenticated_user(user, method, password_version = nil, auth_identity_id: nil)
    return unless user
    if %w[google apple linked_google linked_apple].include?(method)
      identity = user.auth_identities.find_by(id: auth_identity_id, provider: method.delete_prefix("linked_"))
      return identity&.ownership_verified? ? user : nil
    end
    unless user.password_confirmed?
      @email_confirmation_required = true
      return
    end
    return if password_version != user.password_session_version
    user
  end
end
