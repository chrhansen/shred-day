module Api
  module V1
    class ResortsController < ApplicationController

      # GET /api/v1/resorts
      # GET /api/v1/resorts?query=abc
      def index
        result = ResortSearchService.new(user: current_user, query: params[:query]).search_resorts
        render json: result.resorts
      end

      # POST /api/v1/resorts
      def create
        result = ResortSuggestionService.new(
          user: current_user,
          name: resort_params[:name],
          country: resort_params[:country]
        ).suggest_resort

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
