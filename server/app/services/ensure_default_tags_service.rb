class EnsureDefaultTagsService
  Result = Struct.new(:success, :tags, :errors, keyword_init: true) do
    def success?
      success
    end
  end

  DEFAULT_TAGS = ["With Friends", "Training", "Bluebird"].freeze

  def initialize(user, default_tags: DEFAULT_TAGS)
    @user = user
    @default_tags = default_tags
  end

  def create_default_tags
    return Result.new(success: false, tags: [], errors: ["User is required"]) unless @user

    tags = @default_tags.map do |tag_name|
      @user.tags.find_or_create_by!(name: tag_name)
    end

    Result.new(success: true, tags: tags, errors: nil)
  rescue StandardError => e
    Result.new(success: false, tags: [], errors: [e.message])
  end
end
