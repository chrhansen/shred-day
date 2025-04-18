class Api::V1::StatsController < ApplicationController
  # GET /api/v1/stats
  def show
    total_days = Day.count
    unique_resorts = Day.distinct.count(:resort)
    # Find the most frequent ski. This can be complex for ties or no data.
    most_used_ski_data = Day.group(:ski).count.max_by { |_ski, count| count }
    most_used_ski = most_used_ski_data ? most_used_ski_data[0] : "N/A" # Handle cases with no days logged

    render json: {
      totalDays: total_days,
      uniqueResorts: unique_resorts,
      mostUsedSki: most_used_ski
    }
  end
end
