class Api::V1::StatsController < ApplicationController

  # GET /api/v1/stats
  def show
    # Scope queries to the currently logged-in user's days
    user_days = current_user.days

    total_days = user_days.count
    unique_resorts = user_days.distinct.count(:resort)
    most_used_ski_id = user_days.group(:ski_id).count.max_by { |_ski_id, count| count }
    most_used_ski = current_user.skis.find_by(id: most_used_ski_id)

    render json: {
      totalDays: total_days,
      uniqueResorts: unique_resorts,
      mostUsedSki: most_used_ski&.name || "N/A"
    }
  end
end
