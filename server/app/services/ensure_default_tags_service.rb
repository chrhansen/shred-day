class EnsureDefaultTagsService
  Result = Struct.new(:created, :tags, :errors, keyword_init: true) do
    def created?
      created
    end
  end

  DEFAULT_TAGS = ["With Friends", "Training", "Bluebird"].freeze

  def initialize(user, default_tags: DEFAULT_TAGS)
    @user = user
    @default_tags = default_tags
  end

  def create_default_tags
    return Result.new(created: false, tags: [], errors: ["User is required"]) unless @user

    tags = @default_tags.map do |tag_name|
      @user.tags.find_or_create_by!(name: tag_name)
    end

    Result.new(created: true, tags: tags, errors: nil)
  rescue StandardError => e
    Rails.logger.error("Failed to seed default tags for user #{@user&.id}: #{e.message}")
    Result.new(created: false, tags: [], errors: [e.message])
  end
end
