module Api
  module V1
    class ResortsController < ApplicationController
      # Skip the require_login filter for the index action, unless you intend
      # to require login for search as mentioned in a previous message.
      # If search requires login, remove the line below.
      # skip_before_action :require_login, only: [:index]

      # GET /api/v1/resorts
      # GET /api/v1/resorts?query=abc
      def index
        if params[:query].present?
          # Search for resorts where the name contains the query (case-insensitive)
          # Limit results for performance and usability
          @resorts = Resort.where("LOWER(name) LIKE ?", "%#{params[:query].downcase}%").limit(20)
        else
          # Return empty array if no query is provided
          @resorts = []
        end

        render json: @resorts
      end
    end
  end
end
