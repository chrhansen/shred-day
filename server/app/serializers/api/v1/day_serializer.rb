module Api
  module V1
    class DaySerializer < ActiveModel::Serializer
      # Include url_helpers to generate attachment URLs
      include Rails.application.routes.url_helpers

      attributes :id, :date, :activity, :resort_id, :ski_id, :user_id, :created_at, :updated_at, :photos

      # Use belongs_to to embed the full associated objects
      belongs_to :ski
      belongs_to :resort

      def photos
        object.photos.map do |photo|
          # Return a hash including the photo ID and the image URL
          {
            id: photo.id,
            url: photo.image.attached? ? url_for(photo.image) : nil
          }
        end
      end

    end
  end
end
