module Api
  module V1
    # Controller dedicated to fetching resorts recently visited by the current user.
    class RecentResortsController < ApplicationController
      # GET /api/v1/recent_resorts
      def index
        # Fetch the 5 most recently visited unique resorts for the user
        # directly joining and selecting necessary fields.
        recent_resorts_data = current_user.days
                                       .joins(:resort)
                                       .select(
                                         'resorts.id',
                                         'resorts.name',
                                         'resorts.country',
                                         'resorts.region',
                                         'resorts.latitude',
                                         'resorts.longitude',
                                         'MAX(days.date) as last_visit_date'
                                        )
                                       .group('resorts.id') # Group by resort primary key
                                       .order('last_visit_date DESC')
                                       .limit(5)

        render json: recent_resorts_data
      end
    end
  end
end
