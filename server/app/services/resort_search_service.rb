class ResortSearchService
  def initialize(user:, query:)
    @user = user
    @query = query
  end

  def search_resorts
    if query.blank?
      return Result.new(resorts: [])
    end

    normalized_query = query.to_s.downcase
    base_scope = Resort.where("LOWER(name) LIKE ?", "%#{normalized_query}%")
    verified_scope = base_scope.where(verified: true)
    visible_scope = user.present? ? verified_scope.or(base_scope.where(suggested_by: user.id)) : verified_scope

    Result.new(resorts: visible_scope.limit(20))
  end

  private

  attr_reader :user, :query

  class Result
    attr_reader :resorts

    def initialize(resorts:)
      @resorts = resorts
    end

    def searched?
      true
    end
  end
end
