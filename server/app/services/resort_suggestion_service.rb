class ResortSuggestionService
  def initialize(current_user:)
    @current_user = current_user
  end

  def suggest_resort(name:, country:)
    resort = Resort.new(
      name: sanitize_resort_name(name),
      country: country,
      suggested_at: Time.current,
      suggested_by: current_user.id,
      verified: false
    )

    resort.save

    Result.new(resort: resort)
  end

  private

  attr_reader :current_user

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
