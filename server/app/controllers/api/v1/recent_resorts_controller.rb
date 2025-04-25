module Api
  module V1
    # Controller dedicated to fetching resorts recently visited by the current user.
    class RecentResortsController < ApplicationController
      # GET /api/v1/recent_resorts
      def index
        # Use the recent_resorts association defined in the User model
        # The association handles joining, grouping, selecting, and ordering.
        # We just need to limit the results here.
        recent_resorts = current_user.recent_resorts.limit(5)

        render json: recent_resorts
      end
    end
  end
end
