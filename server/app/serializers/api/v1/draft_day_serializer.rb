module Api
  module V1
    class DraftDaySerializer < ActiveModel::Serializer

      attributes :id, :date, :decision, :day_id

      belongs_to :resort, serializer: Api::V1::ResortSerializer
      has_many :photos, each_serializer: Api::V1::PhotoSerializer
    end
  end
end
