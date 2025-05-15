class Api::V1::StatsController < ApplicationController

  # GET /api/v1/stats
  def show
    # Scope queries to the currently logged-in user's days
    user_days = current_user.days

    total_days = user_days.count
    # Count distinct resort_id from the user's days
    unique_resorts = user_days.select(:resort_id).distinct.count
    # most_used_ski_ids = user_days.group(:ski_ids).count.max_by { |_ski_ids, count| count }
    # most_used_skis = current_user.skis.find_by(id: most_used_ski_ids ? most_used_ski_ids[0] : nil)

    render json: {
      totalDays: total_days,
      uniqueResorts: unique_resorts,
      mostUsedSki: "-"
    }
  end
end
