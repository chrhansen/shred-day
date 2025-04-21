class Api::V1::StatsController < ApplicationController

  # GET /api/v1/stats
  def show
    # Scope queries to the currently logged-in user's days
    user_days = current_user.days

    total_days = user_days.count
    unique_resorts = user_days.distinct.count(:resort)
    # Find the most frequent ski for the current user.
    most_used_ski_data = user_days.group(:ski).count.max_by { |_ski, count| count }
    most_used_ski = most_used_ski_data ? most_used_ski_data[0] : "N/A" # Handle cases with no days logged

    render json: {
      totalDays: total_days,
      uniqueResorts: unique_resorts,
      mostUsedSki: most_used_ski
    }
  end
end
