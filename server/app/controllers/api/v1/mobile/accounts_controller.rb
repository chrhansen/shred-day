class Api::V1::Mobile::AccountsController < ApplicationController
  def destroy
    recent_session = current_mobile_session && current_mobile_session.created_at >= 5.minutes.ago
    unless recent_session && params[:confirmation] == "DELETE"
      return render json: { error: "Sign in again and confirm account deletion." }, status: :unauthorized
    end
    result = Users::DeleteAccountService.new(current_user).delete_account
    if result.deleted?
      reset_session
      head :no_content
    else
      render json: { error: result.error }, status: :unprocessable_content
    end
  end
end
