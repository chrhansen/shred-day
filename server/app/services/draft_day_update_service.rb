# This service is used to update a draft day during text/photo imports.
# When a user edits the date/resort of a draft day, we need to:
# 1. Check if another draft day with the same date/resort already exists (merge/delete duplicate)
# 2. Update the day association if it has changed
# 3. Set the appropriate decision based on whether a matching day exists
class DraftDayUpdateService
  def initialize(draft_day, draft_day_params)
    @draft_day = draft_day
    @draft_day_params = draft_day_params
    @original_date = @draft_day.date
    @original_resort_id = @draft_day.resort_id
  end

  def update_draft_day
    # Store original values for comparison
    new_date = @draft_day_params[:date] ? Date.parse(@draft_day_params[:date].to_s) : @draft_day.date
    new_resort_id = @draft_day_params[:resort_id] || @draft_day.resort_id
    
    # Check if date or resort changed
    date_changed = new_date != @original_date
    resort_changed = new_resort_id != @original_resort_id
    
    if date_changed || resort_changed
      # Check for existing draft day with same date/resort in the same import
      import = @draft_day.photo_import || @draft_day.text_import
      existing_draft = find_existing_draft_day(import, new_date, new_resort_id)
      
      if existing_draft && existing_draft.id != @draft_day.id
        # Merge into existing draft day and delete current one
        merge_into_existing_draft(existing_draft)
        return Result.new(updated: true, draft_day: existing_draft, merged: true)
      end
    end
    
    # Update the draft day
    @draft_day.update(@draft_day_params)
    
    if @draft_day.valid? && (date_changed || resort_changed)
      # Update the day association and decision
      update_day_association_and_decision
    end
    
    Result.new(updated: @draft_day.valid?, draft_day: @draft_day, merged: false)
  end

  private

  def find_existing_draft_day(import, date, resort_id)
    if import.is_a?(PhotoImport)
      import.draft_days.find_by(date: date, resort_id: resort_id)
    elsif import.is_a?(TextImport)
      import.draft_days.find_by(date: date, resort_id: resort_id)
    end
  end

  def merge_into_existing_draft(existing_draft)
    # Move photos from current draft to existing draft (for photo imports)
    if @draft_day.photos.any?
      @draft_day.photos.update_all(draft_day_id: existing_draft.id)
    end
    
    # Merge any additional attributes if needed
    # For text imports, we might want to combine original_text or other fields
    if @draft_day.original_text.present? && existing_draft.original_text.present?
      combined_text = [existing_draft.original_text, @draft_day.original_text].join("\n")
      existing_draft.update(original_text: combined_text)
    elsif @draft_day.original_text.present?
      existing_draft.update(original_text: @draft_day.original_text)
    end
    
    # Delete the current draft day
    @draft_day.destroy
  end

  def update_day_association_and_decision
    import = @draft_day.photo_import || @draft_day.text_import
    user = import.user
    
    # Find matching day with new date/resort
    matching_day = user.days.find_by(date: @draft_day.date, resort: @draft_day.resort)
    
    # Update day association and decision
    @draft_day.update(day: matching_day)
    
    if matching_day
      @draft_day.decision_merge!
    else
      @draft_day.decision_duplicate!
    end
  end

  class Result
    attr_reader :draft_day

    def initialize(updated:, draft_day:, merged: false)
      @updated = updated
      @draft_day = draft_day
      @merged = merged
    end

    def updated?
      @updated
    end

    def merged?
      @merged
    end
  end
end