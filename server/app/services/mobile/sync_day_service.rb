module Mobile
  class SyncDayService
    def initialize(user, operation_id:, action:, day_id: nil, version: nil, attributes: {})
      @user, @operation_id, @action, @day_id, @version, @attributes = user, operation_id, action, day_id, version, attributes
    end

    def sync_day
      return Result.new({ error: "Invalid operation" }, 422) unless @operation_id.to_s.match?(/\A[\w-]{16,100}\z/) && %w[save delete].include?(@action)

      digest = Digest::SHA256.hexdigest(JSON.generate([ @action, @day_id, @version, @attributes.to_h.deep_stringify_keys.sort.to_h ]))
      @user.with_lock do
        receipt = @user.mobile_sync_receipts.find_by(operation_id: @operation_id)
        if receipt
          return Result.new({ error: "Operation ID already used" }, 409) unless receipt.request_digest == digest
          return Result.new(receipt.response_body, receipt.response_status)
        end

        day = @user.days.lock.includes(:resort, :skis, :tags, :photos).find_by(id: @day_id) if @day_id.present?
        return Result.new({ error: "Day not found", code: "day_missing" }, 404) if @day_id.present? && !day
        if day && (@version.blank? || day.updated_at.iso8601(6) != @version)
          return Result.new({ error: "This day changed on another device", day: serialize(day) }, 409)
        end
        dates = [ day&.date ]
        if @action == "delete"
          return Result.new({ error: "Day not found" }, 404) unless day
          day.destroy!
          DayNumberUpdaterService.new(user: @user, affected_dates: dates).update!
          body = { day: nil }
        else
          # Validate every reference before any side effects, including photo removal.
          skis = @user.skis.find(Array(@attributes[:ski_ids]).uniq)
          tags = Array(@attributes[:tag_ids]).uniq
          return Result.new({ error: "One or more tags were not found" }, 422) unless @user.tags.where(id: tags).count == tags.length
          photos = Array(@attributes[:photo_ids]).uniq
          available = @user.photos.where(id: photos).where(day_id: [ nil, day&.id ]).count
          return Result.new({ error: "One or more photos were not found" }, 422) unless available == photos.length
          result = if day
            Days::UpdateDayService.new(day, @attributes.except(:photo_ids, :tag_ids), tag_ids: @attributes[:tag_ids]).update_day
          else
            Days::CreateDayService.new(@user, @attributes.except(:photo_ids, :ski_ids, :tag_ids), tag_ids: @attributes[:tag_ids]).create_day
          end
          unless day ? result.updated? : result.created?
            return Result.new({ errors: result.errors }, 422)
          end
          day = result.day
          day.skis = skis
          Days::SyncPhotosService.new(day, photos).sync_photos
          day.touch
          dates << day.date
          body = { day: serialize(day.reload) }
        end
        @user.mobile_sync_receipts.create!(operation_id: @operation_id, request_digest: digest,
          response_body: body, response_status: 200)
        integration = @user.google_sheet_integration
        GoogleSheetsSyncJob.perform_later(integration.id, dates.compact.uniq) if integration&.status_connected?
        Result.new(body, 200)
      end
    rescue ActiveRecord::RecordNotFound
      Result.new({ error: "Day or equipment not found" }, 404)
    end

    private

    def serialize(day)
      Api::V1::DaySerializer.new(day).as_json
    end

    class Result
      attr_reader :body, :status
      def initialize(body, status)
        @body, @status = body, status
      end
      def synced?
        @status == 200
      end
    end
  end
end
