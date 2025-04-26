module Api
  module V1
    class SkiSerializer < ActiveModel::Serializer
      attributes :id, :name, :user_id, :created_at, :updated_at
      # No associations needed for this basic serializer
    end
  end
end
