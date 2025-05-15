module Api
  module V1
    class PhotoImportSerializer < ActiveModel::Serializer

      attributes :id, :status, :created_at, :updated_at

      has_many :draft_days, serializer: Api::V1::DraftDaySerializer
      has_many :photos, serializer: Api::V1::PhotoSerializer
    end
  end
end
