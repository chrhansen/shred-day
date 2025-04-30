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
        # Return the URL for the pre-processed :preview variant
        if object.image.attached?
          # Get the variant; this will return the processed variant if preprocessed: true
          variant = object.image.variant(:preview)
          # Ensure the variant processed correctly before generating URL (optional but safer)
          # variant.processed
          url_for(variant)
        end
      end
    end
  end
end
