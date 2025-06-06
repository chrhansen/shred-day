module Api
  module V1
    class TextImportSerializer < ActiveModel::Serializer

      attributes :id, :status, :created_at, :updated_at, :original_text

      has_many :draft_days, serializer: Api::V1::DraftDaySerializer
    end
  end
end
