module Api
  module V1
    class DaySerializer < ActiveModel::Serializer
      attributes :id, :date, :activity, :resort_id, :ski_id, :user_id, :created_at, :updated_at

      # Use belongs_to to embed the full associated objects
      belongs_to :ski
      belongs_to :resort
    end
  end
end
