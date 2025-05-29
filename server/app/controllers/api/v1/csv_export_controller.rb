module Api
  module V1
    class CsvExportController < ApplicationController
      def show
        seasons_and_columns = CsvExportShowService.new(current_user).fetch_seasons_and_columns

        render json: seasons_and_columns, status: :ok
      end

      def create
        result = CsvExportCreateService.new(current_user, export_params[:season_ids], export_params[:columns]).create_csv_string

        if result.created?
          send_data result.csv_string,
                    type: 'text/csv; charset=utf-8; header=present',
                    disposition: "attachment; filename=shred_day_export_#{Time.now.strftime('%Y-%m-%d_%H%M%S')}.csv"
        else
          render json: { error: result.error }, status: :bad_request
        end
      end

      private

      def export_params
        params.permit(season_ids: [], columns: [:id, :label, :enabled])
      end
    end
  end
end
