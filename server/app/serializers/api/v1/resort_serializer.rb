module Api
  module V1
    class ResortSerializer < ActiveModel::Serializer
      attributes :id, :name, :latitude, :longitude, :country, :region, :created_at, :updated_at
      # No associations needed for this basic serializer
    end
  end
end
