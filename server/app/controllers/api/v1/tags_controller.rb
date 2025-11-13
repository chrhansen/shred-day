class Api::V1::TagsController < ApplicationController
  before_action :set_tag, only: [:destroy]

  def index
    tags = current_user.tags.order(Arel.sql("LOWER(name)"))
    render json: tags
  end

  def create
    tag = current_user.tags.build(tag_params)

    if tag.save
      render json: tag, status: :created
    else
      render json: { errors: tag.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def destroy
    if @tag.destroy
      head :no_content
    else
      render json: { errors: @tag.errors.full_messages }, status: :unprocessable_entity
    end
  end

  private

  def set_tag
    @tag = current_user.tags.find(params[:id])
  rescue ActiveRecord::RecordNotFound
    render json: { error: "Tag not found" }, status: :not_found
  end

  def tag_params
    params.require(:tag).permit(:name)
  end
end
