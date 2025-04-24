module Api
  module V1
    # Controller dedicated to fetching resorts recently visited by the current user.
    class RecentResortsController < ApplicationController
      # GET /api/v1/recent_resorts
      def index
        # Find the 5 most recently visited unique resort IDs for the user.
        # 1. Group days by resort_id.
        # 2. Find the latest created_at (last visit) for each group.
        # 3. Order the groups by this latest created_at descending.
        # 4. Limit to the top 5.
        # 5. Pluck just the resort_id from these top 5 groups.
        recent_resort_ids = current_user.days
                                       .select(:resort_id, 'MAX(created_at) as last_visit_time')
                                       .group(:resort_id)
                                       .order('MAX(created_at) DESC')
                                       .limit(5)
                                       .pluck(:resort_id)

        # Fetch the actual Resort objects, preserving the order from the previous query
        if recent_resort_ids.present?
          # We use a CASE statement in ORDER BY to sort by the order in recent_resort_ids
          # which reflects the order of recent visits.
          ordering_clause = "CASE id "
          recent_resort_ids.each_with_index do |id, index|
            ordering_clause << "WHEN '#{ActiveRecord::Base.connection.quote_string(id)}' THEN #{index} "
          end
          ordering_clause << "END"

          @resorts = Resort.where(id: recent_resort_ids).order(Arel.sql(ordering_clause))
        else
          @resorts = []
        end

        render json: @resorts
      end
    end
  end
end
