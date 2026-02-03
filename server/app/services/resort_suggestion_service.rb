class ResortSuggestionService
  def initialize(user:, name:, country:)
    @user = user
    @name = name
    @country = country
  end

  def suggest_resort
    resort = Resort.new(
      name: sanitize_resort_name(name),
      country: country,
      suggested_at: Time.current,
      suggested_by: user.id,
      verified: false
    )

    resort.save

    Result.new(resort: resort)
  end

  private

  attr_reader :user, :name, :country

  def sanitize_resort_name(name)
    name.to_s
      .gsub(/[^A-Za-z0-9.\- ]+/, '')
      .gsub(/\s+/, ' ')
      .strip
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
