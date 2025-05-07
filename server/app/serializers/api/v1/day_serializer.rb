module Api
  module V1
    class DaySerializer < ActiveModel::Serializer
      # Include url_helpers to generate attachment URLs
      include Rails.application.routes.url_helpers

      attributes :id, :date, :activity, :user_id, :created_at, :updated_at, :notes

      # Use belongs_to to embed the full associated objects
      belongs_to :ski
      belongs_to :resort

      # Use has_many with the dedicated PhotoSerializer
      has_many :photos, serializer: Api::V1::PhotoSerializer
    end
  end
end
