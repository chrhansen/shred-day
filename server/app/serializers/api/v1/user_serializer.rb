class Api::V1::UserSerializer < ActiveModel::Serializer
  include Rails.application.routes.url_helpers

  attributes :id, :email, :full_name, :created_at, :season_start_day, :available_seasons, :username, :avatar_url

  def available_seasons
    @instance_options[:available_seasons]
  end

  def avatar_url
    return unless object.avatar.attached?

    url_for(object.avatar)
  end
end
