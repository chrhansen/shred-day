module Api
  module V1
    class DaySerializer < ActiveModel::Serializer
      attributes :id, :date, :activity, :resort_id, :ski_id, :user_id, :created_at, :updated_at

      # Include associated object names directly
      attribute :ski_name do
        object.ski.name
      end

      attribute :resort_name do
        object.resort.name
      end

      # Optionally keep belongs_to if needed elsewhere, but names are included above
      # belongs_to :ski
      # belongs_to :resort
    end
  end
end
