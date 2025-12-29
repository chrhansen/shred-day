module Api
  module V1
    class SharedDaySerializer < ActiveModel::Serializer
      attributes :id, :date, :created_at, :updated_at, :notes, :day_number, :shared_at

      belongs_to :resort
      has_many :photos, serializer: Api::V1::PhotoSerializer
      has_many :skis, serializer: Api::V1::SkiSerializer
      belongs_to :user, serializer: Api::V1::SharedUserSerializer

      attribute :tags do
        object.tags.map { |tag| { id: tag.id, name: tag.name } }
      end
    end
  end
end
