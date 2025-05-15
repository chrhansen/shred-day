module Api
  module V1
    class SkiSerializer < ActiveModel::Serializer
      attributes :id, :name, :user_id, :created_at, :updated_at
      # No associations needed for this basic serializer

      has_many :days, serializer: Api::V1::DayEntrySerializer
    end
  end
end
