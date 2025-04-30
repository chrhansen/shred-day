module Api
  module V1
    class PhotoSerializer < ActiveModel::Serializer
      include Rails.application.routes.url_helpers # Needed for url_for

      attributes :id, :filename, :url

      def filename
        object.image.filename.to_s if object.image.attached?
      end

      def url
        # Generate the URL only if the image is attached
        url_for(object.image) if object.image.attached?
      end
    end
  end
end
