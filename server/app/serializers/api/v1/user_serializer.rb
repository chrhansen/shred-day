class Api::V1::UserSerializer < ActiveModel::Serializer
  attributes :id, :email, :created_at, :season_start_day
end
