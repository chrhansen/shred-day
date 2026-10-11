class Api::V1::Mobile::ChallengesController < ApplicationController
  skip_before_action :require_login, only: :create
  rate_limit to: 20, within: 1.minute, only: :create

  def create
    MobileAuthChallenge.where("expires_at < ?", 1.day.ago).delete_all
    nonce = SecureRandom.hex(32)
    challenge = MobileAuthChallenge.create!(nonce_digest: Digest::SHA256.hexdigest(nonce), expires_at: 5.minutes.from_now)
    render json: { id: challenge.id, nonce: nonce }, status: :created
  end
end
