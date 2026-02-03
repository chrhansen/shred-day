class ResortSearchService
  def initialize(current_user:)
    @current_user = current_user
  end

  def search_resorts(query:)
    if query.blank?
      return Result.new(resorts: [])
    end

    normalized_query = query.to_s.downcase
    base_scope = Resort.where("LOWER(name) LIKE ?", "%#{normalized_query}%")
    visible_scope = base_scope.where(verified: true)
      .or(base_scope.where(suggested_by: current_user.id))

    Result.new(resorts: visible_scope.limit(20))
  end

  private

  attr_reader :current_user

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
