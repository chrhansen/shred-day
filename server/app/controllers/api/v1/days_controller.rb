class Api::V1::DaysController < ApplicationController
  # POST /api/v1/days
  def create
    day = Day.new(day_params)

    if day.save
      render json: day, status: :created # Return created day on success (201)
    else
      render json: day.errors, status: :unprocessable_entity # Return errors on failure (422)
    end
  end

  # GET /api/v1/stats
  def stats
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

  private

  # Strong parameters: only allow permitted attributes
  def day_params
    params.require(:day).permit(:date, :resort, :ski, :activity)
  end
end
