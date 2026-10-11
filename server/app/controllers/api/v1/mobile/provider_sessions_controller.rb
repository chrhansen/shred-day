class Api::V1::Mobile::ProviderSessionsController < Api::V1::Mobile::SessionsController
  skip_before_action :require_login, only: :create

  def create
    if request.headers["Authorization"].present? && current_mobile_session.nil?
      return render json: { error: "Please sign in again" }, status: :unauthorized
    end
    result = Mobile::ProviderSignInService.new(provider: params[:provider], identity_token: params[:identity_token],
      authorization_code: params[:authorization_code], challenge_id: params[:challenge_id], user: current_mobile_session&.user).sign_in
    if result.signed_in?
      render json: session_payload(result.session_result), status: :created
    else
      render json: { error: result.error }, status: :unauthorized
    end
  end
end
