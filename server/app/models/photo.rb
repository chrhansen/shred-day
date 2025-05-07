class Photo < ApplicationRecord
  has_one_attached :image do |blob|
    # Define a preview variant: resize to fit 300x300 and convert to JPEG
    blob.variant :preview, resize_to_limit: [300, 300], format: :jpg, preprocessed: true
    blob.variant :full, resize_to_limit: [1200, 1200], format: :jpg, preprocessed: true
  end

  belongs_to :user
  belongs_to :day, optional: true


  # validates :image, presence: true, blob: { content_type: ['image/png', 'image/jpeg', 'image/gif', 'image/heic', 'image/heif'], size_range: 1..(10.megabytes) }
end
