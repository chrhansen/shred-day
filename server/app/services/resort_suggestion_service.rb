class ResortSuggestionService
  def initialize(user:, name:, country: nil, latitude: nil, longitude: nil)
    @user = user
    @name = name
    @country = country
    @latitude = latitude
    @longitude = longitude
  end

  def suggest_resort
    normalized_country = country.to_s.strip
    resort = Resort.new(
      name: sanitize_resort_name(name),
      country: normalized_country.presence,
      latitude: normalized_coordinate(latitude),
      longitude: normalized_coordinate(longitude),
      suggested_at: Time.current,
      suggested_by: user.id,
      verified: false
    )

    resort.save
    UserMailer.resort_suggestion_notification(user, resort).deliver_later if resort.persisted?

    Result.new(resort: resort)
  end

  private

  attr_reader :user, :name, :country, :latitude, :longitude

  def sanitize_resort_name(name)
    name.to_s
      .gsub(/[^A-Za-z0-9.\- ]+/, '')
      .gsub(/\s+/, ' ')
      .strip
  end

  def normalized_coordinate(value)
    value.to_s.strip.presence
  end

  class Result
    attr_reader :resort

    def initialize(resort:)
      @resort = resort
    end

    def created?
      resort.persisted?
    end

    def errors
      resort.errors
    end
  end
end
