module Api
  module V1
    # Serializer specifically for the /-index action (list view)
    class DayEntrySerializer < ActiveModel::Serializer
      attributes :id, :date, :activity, :created_at, :updated_at

      # Include associated names directly as expected by SkiDayEntry type

      attribute :has_notes do
        object.notes.present?
      end

      attribute :ski_names do
        object.skis.map(&:name)
      end

      attribute :resort_name do
        object.resort&.name
      end

      # Use has_many with the dedicated PhotoSerializer
      has_many :photos, serializer: Api::V1::PhotoSerializer
    end
  end
end
