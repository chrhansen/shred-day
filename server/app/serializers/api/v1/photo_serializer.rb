module Api
  module V1
    class PhotoSerializer < ActiveModel::Serializer
      include Rails.application.routes.url_helpers # Needed for url_for

      attributes :id, :filename, :preview_url, :full_url

      def filename
        object.image.filename.to_s if object.image.attached?
      end

      def preview_url
        if object.image.attached?
          begin
            # Get the preview variant
            variant = object.image.variant(:preview)
            url_for(variant)
          rescue StandardError => e
            Rails.logger.error "Error generating preview variant URL for Photo ##{object.id}: #{e.message}"
            nil
          end
        end
      end

      def full_url
         if object.image.attached?
           begin
             # Get the full variant
             variant = object.image.variant(:full)
             url_for(variant)
           rescue StandardError => e
             Rails.logger.error "Error generating full variant URL for Photo ##{object.id}: #{e.message}"
             nil
           end
         end
      end
    end
  end
end
