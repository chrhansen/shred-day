class Api::V1::StatsController < ApplicationController

  # GET /api/v1/stats
  def show
    user_days = current_user.days

    total_days = user_days.count
    unique_resorts = user_days.select(:resort_id).distinct.count

    most_used_ski_name = "-"

    ski_counts = current_user.days.joins(:skis).group('skis.id').count

    if ski_counts.any?
      most_used_ski_id = ski_counts.key(ski_counts.values.max)

      most_used_ski_name = current_user.skis.find_by(id: most_used_ski_id).name
    end

    render json: {
      totalDays: total_days,
      uniqueResorts: unique_resorts,
      mostUsedSki: most_used_ski_name
    }
  end
end
