module Api
  module V1
    class ResortsController < ApplicationController

      # GET /api/v1/resorts
      # GET /api/v1/resorts?query=abc
      def index
        if params[:query].present?
          # Search for resorts where the name contains the query (case-insensitive)
          # Limit results for performance and usability
          query = "%#{params[:query].downcase}%"
          base_scope = Resort.where("LOWER(name) LIKE ?", query)
          visible_scope = base_scope.where(verified: true)
            .or(base_scope.where(suggested_by: current_user.id))
          @resorts = visible_scope.limit(20)
        else
          # Return empty array if no query is provided
          @resorts = []
        end

        render json: @resorts
      end

      # POST /api/v1/resorts
      def create
        resort = Resort.new(resort_params.merge(
          suggested_at: Time.current,
          suggested_by: current_user.id,
          verified: false
        ))

        if resort.save
          render json: resort, status: :created
        else
          render json: resort.errors, status: :unprocessable_entity
        end
      end

      private

      def resort_params
        params.require(:resort).permit(:name, :country)
      end
    end
  end
end
