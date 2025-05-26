class Days::SyncPhotosService
  def initialize(day, incoming_photo_ids)
    @day = day
    @user = day.user

    @incoming_photo_ids = incoming_photo_ids || []
  end

  # Helper method to synchronize photos (used by days#update and days#create)
  def sync_photos
    return if @incoming_photo_ids.blank?

    incoming_photo_ids = Array(@incoming_photo_ids).compact.map(&:to_s) # Ensure array of strings
    current_photo_ids = @day.photos.pluck(:id).map(&:to_s)

    ids_to_add = incoming_photo_ids - current_photo_ids
    ids_to_remove = current_photo_ids - incoming_photo_ids

    if ids_to_add.present?
      photos_to_add = @user.photos.where(id: ids_to_add, day_id: nil)
      photos_to_add.update_all(day_id: @day.id)
    end

    if ids_to_remove.present?
      # Ensure we only destroy photos currently associated with *this* day
      # And also ensure they belong to the current user for security
      photos_to_destroy = @day.photos.where(id: ids_to_remove).where(user_id: @user.id)
      # Destroy the records and their attachments
      photos_to_destroy.destroy_all
    end
  end
end
