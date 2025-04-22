class Api::V1::SkisController < ApplicationController
  before_action :set_ski, only: [:update, :destroy]

  # GET /api/v1/skis
  def index
    @skis = current_user.skis.order(:name)
    render json: @skis
  end

  # POST /api/v1/skis
  def create
    @ski = current_user.skis.build(ski_params)

    if @ski.save
      render json: @ski, status: :created
    else
      render json: @ski.errors, status: :unprocessable_entity
    end
  end

  # PATCH/PUT /api/v1/skis/:id
  def update
    if @ski.update(ski_params)
      render json: @ski
    else
      render json: @ski.errors, status: :unprocessable_entity
    end
  end

  # DELETE /api/v1/skis/:id
  def destroy
    @ski.destroy
    head :no_content # Return 204 No Content on successful deletion
  end

  private

  # Use callbacks to share common setup or constraints between actions.
  def set_ski
    @ski = current_user.skis.find(params[:id])
  rescue ActiveRecord::RecordNotFound
    render json: { error: "Ski not found" }, status: :not_found
  end

  # Only allow a list of trusted parameters through.
  def ski_params
    params.require(:ski).permit(:name)
  end
end
