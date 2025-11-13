class EnsureDefaultTagsService
  DEFAULT_TAGS = ["With Friends", "Training", "Bluebird"].freeze

  def initialize(user, default_tags: DEFAULT_TAGS)
    @user = user
    @default_tags = default_tags
  end

  def create_default_tags
    return unless @user

    @default_tags.each do |tag_name|
      @user.tags.find_or_create_by!(name: tag_name)
    end
  end
end
