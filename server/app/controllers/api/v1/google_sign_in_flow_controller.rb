class Api::V1::GoogleSignInFlowController < ApplicationController
  skip_before_action :require_login, only: [:create, :update]

  # Will create the Google-account-link, incl. Client-ID, scopes, etc. and send
  # it back to the client to start the OAuth flow.
  def create
    result = GoogleAuthUrlService.new(session: session).auth_url

    render json: { url: result.auth_url }
  end

  # Called by the frontend when the user has granted access to their Google
  # account and is redirected back to the callback URL (the sign in page). The
  # frontend will call this endpoint with the code from Google, to exchange it for
  # an access token, and the user-info. After this, we will sign the user in in
  # the session cookie.
  def update
    result = GoogleCodeToUserService.new(session: session, code: params[:code], state: params[:state]).to_local_user

    if result.signed_in?
      render json: { message: 'Signed in successfully', user: result.user.as_json(except: :password_digest) }, status: :ok
    else
      render json: { error: result.error }, status: :unauthorized
    end
  end
end
