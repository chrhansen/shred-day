module Days
  class SyncTagsService
    class Result
      attr_reader :errors

      def initialize(synced:, errors:)
        @synced = synced
        @errors = errors
      end

      def synced?
        @synced
      end
    end

    def initialize(day:, user:, tag_ids:)
      @day = day
      @user = user
      @tag_ids = tag_ids
    end

    def sync
      return Result.new(synced: true, errors: nil) if @tag_ids.nil?

      normalized_ids = Array(@tag_ids).map(&:to_s).reject(&:blank?).uniq

      if normalized_ids.empty?
        @day.tags = []
        return Result.new(synced: true, errors: nil)
      end

      tags = @user.tags.where(id: normalized_ids).to_a
      if tags.size != normalized_ids.size
        return Result.new(synced: false, errors: ["One or more tags were not found"])
      end

      @day.tags = tags
      Result.new(synced: true, errors: nil)
    rescue ActiveRecord::RecordInvalid => e
      Result.new(synced: false, errors: [e.message])
    end
  end
end
