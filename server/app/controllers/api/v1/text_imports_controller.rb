class Api::V1::TextImportsController < ApplicationController
  before_action :set_text_import, only: [:show, :update, :destroy]

  def create
    text_import = current_user.text_imports.create!(status: :waiting)

    # Process text or file if provided
    text_content = params[:text]
    uploaded_file = params[:file]
    season_offset = params[:season_offset].to_i if params[:season_offset].present?

    if uploaded_file.present?
      text_content = uploaded_file.read.force_encoding('UTF-8')
      unless text_content.valid_encoding?
        text_content = text_content.encode('UTF-8', invalid: :replace, undef: :replace, replace: '?')
      end
      text_import.update!(original_text: text_content)
    elsif text_content.present?
      text_import.update!(original_text: text_content)
    end

    if text_content.present?
      # Parse the text and create draft days
      result = TextImportParsingService.new(text_import, season_offset).parse_and_create_draft_days

      unless result.parsed?
        Rails.logger.error "Text import parsing failed: #{result.error}"
      end
    end

    render json: text_import.reload,
      serializer: Api::V1::TextImportSerializer,
      include: ['draft_days', 'draft_days.resort'],
      status: :created
  end

  def show
    render json: @text_import,
      serializer: Api::V1::TextImportSerializer,
      include: ['draft_days', 'draft_days.resort']
  end

  def update
    result = TextImportUpdateService.new(@text_import, text_import_params).update_text_import

    if result.updated?
      render json: @text_import.reload,
        serializer: Api::V1::TextImportSerializer,
        include: ['draft_days', 'draft_days.resort']
    else
      render json: { error: result.error }, status: :unprocessable_entity
    end
  end

  def destroy
    @text_import.destroy!
    head :no_content
  end

  private

  def set_text_import
    @text_import = current_user.text_imports.find(params[:id])
  end

  def text_import_params
    params.require(:text_import).permit(:status, :original_text)
  end
end
