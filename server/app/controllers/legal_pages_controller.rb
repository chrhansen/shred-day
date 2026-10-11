class LegalPagesController < ActionController::Base
  def privacy
    render layout: false
  end

  def support
    render layout: false
  end

  def apple_association
    team = ENV["APPLE_TEAM_ID"].presence || Rails.application.credentials.dig(:apple, :team_id)
    return head :service_unavailable if team.blank?

    bundle = ENV.fetch("APPLE_BUNDLE_ID", "day.shred")
    render json: { applinks: { apps: [], details: [ { appID: "#{team}.#{bundle}", paths: [ "/d/*" ] } ] } }
  end
end
