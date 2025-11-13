module Tags
  class EnsureDefaultTagsService
    DEFAULT_NAMES = ["With Friends", "Combat Training", "Bluebird"].freeze

    def initialize(user, default_names: DEFAULT_NAMES)
      @user = user
      @default_names = default_names
    end

    def call
      return unless @user

      @default_names.each do |name|
        @user.tags.find_or_create_by!(name: name)
      end
    end
  end
end
