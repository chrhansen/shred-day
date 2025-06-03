class Api::V1::UserSerializer < ActiveModel::Serializer
  attributes :id, :email, :full_name, :created_at, :season_start_day, :available_seasons

  def available_seasons
    @instance_options[:available_seasons]
  end
end
