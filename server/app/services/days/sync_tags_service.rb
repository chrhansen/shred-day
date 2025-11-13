module Days
  class SyncTagsService
    Result = Struct.new(:synced?, :errors)

    def initialize(day:, user:, tag_ids:)
      @day = day
      @user = user
      @tag_ids = tag_ids
    end

    def sync
      return Result.new(true, nil) if @tag_ids.nil?

      normalized_ids = Array(@tag_ids).map(&:to_s).reject(&:blank?).uniq

      if normalized_ids.empty?
        @day.tags = []
        return Result.new(true, nil)
      end

      tags = @user.tags.where(id: normalized_ids).to_a
      if tags.size != normalized_ids.size
        return Result.new(false, ["One or more labels were not found"])
      end

      @day.tags = tags
      Result.new(true, nil)
    rescue ActiveRecord::RecordInvalid => e
      Result.new(false, [e.message])
    end
  end
end
