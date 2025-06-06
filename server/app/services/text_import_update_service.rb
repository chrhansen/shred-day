# This service is used when a user commits or cancels a text-import. The happy
# path is when the user has decided on all their draft days and now wants to
# create actual days from the draft days where decision is 'duplicate', and merge
# draft days with decision 'merge' into existing days. We make sure to set the
# status to "processing" before we actually start processing the draft-days,
# just in case this service is called multiple times.
class TextImportUpdateService
  def initialize(text_import, text_import_params)
    @text_import = text_import
    @text_import_params = text_import_params
  end

  def update_text_import
    # We only want to update the text import if it's in waiting-status
    unless @text_import.status_waiting?
      return Result.new(updated: false, text_import: @text_import,
        error: "Text import is not in waiting-status, but: \"#{@text_import.status}\"")
    end

    new_status = @text_import_params[:status]

    # If the text import is canceled, we don't need to do anything
    if new_status == 'canceled'
      @text_import.status_canceled!
      return Result.new(updated: true, text_import: @text_import)
    end

    @text_import.status_processing!

    expected = {
      new_days_count: @text_import.draft_days.decision_duplicate.count,
      merge_day_count: @text_import.draft_days.decision_merge.count
    }

    actual = {
      new_days_count: 0,
      merge_day_count: 0
    }

    affected_dates = []

    @text_import.draft_days.each do |draft_day|
      case draft_day.decision
      when 'merge'
        actual[:merge_day_count] += 1 if merge_draft_day(draft_day)
      when 'duplicate'
        day = create_new_day(draft_day)
        if day
          actual[:new_days_count] += 1
          affected_dates << day.date
        end
      else
        # Either pending or skip, either way, do nothing
      end
    end

    # Update day numbers for newly created days
    if affected_dates.any?
      DayNumberUpdaterService.new(user: @text_import.user, affected_dates: affected_dates).update!
    end

    if expected == actual
      @text_import.status_committed!
    else
      @text_import.status_failed!
    end

    Result.new(updated: @text_import.valid?, text_import: @text_import)
  end

  private

  def merge_draft_day(draft_day)
    # For text imports, merging doesn't involve moving photos, just marking as handled
    # The draft_day already has a reference to the existing day via draft_day.day
    orig_day = draft_day.day
    return false unless orig_day

    # We could add notes or other data to the existing day here if needed
    # For now, we just consider it successfully merged
    true
  end

  def create_new_day(draft_day)
    user = @text_import.user
    new_day = user.days.create(
      date: draft_day.date,
      resort: draft_day.resort,
      notes: draft_day.original_text ? "Imported from text: #{draft_day.original_text.gsub(/\r\n?|\n/, ' ')}" : nil
    )

    if new_day.persisted?
      # Update the draft day to reference the newly created day
      draft_day.update(day: new_day)
      new_day
    else
      nil
    end
  end

  class Result
    attr_reader :text_import, :error

    def initialize(updated:, text_import:, error: nil)
      @updated = updated
      @text_import = text_import
      @error = error
    end

    def updated?
      @updated
    end
  end
end
