module Api
  module V1
    class SharedUserSerializer < ActiveModel::Serializer
      include Rails.application.routes.url_helpers

      attributes :id, :username, :avatar_url

      def avatar_url
        return unless object.avatar.attached?

        url_for(object.avatar)
      end
    end
  end
end
