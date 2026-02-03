module Api
  module V1
    class ResortsController < ApplicationController

      # GET /api/v1/resorts
      # GET /api/v1/resorts?query=abc
      def index
        result = ResortSearchService.new(current_user: current_user).search_resorts(query: params[:query])
        render json: result.resorts
      end

      # POST /api/v1/resorts
      def create
        result = ResortSuggestionService.new(current_user: current_user).suggest_resort(
          name: resort_params[:name],
          country: resort_params[:country]
        )

        if result.created?
          render json: result.resort, status: :created
        else
          render json: result.errors, status: :unprocessable_entity
        end
      end

      private

      def resort_params
        params.require(:resort).permit(:name, :country)
      end
    end
  end
end
