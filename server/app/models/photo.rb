class Photo < ApplicationRecord
  belongs_to :day
  has_one_attached :image do |attachable|
    # Define a preview variant: resize to fit 300x300 and convert to JPEG
    attachable.variant :preview, resize_to_limit: [300, 300], format: :jpg, preprocessed: true
  end

  # Optional: Add validation for image presence or content type if needed
  # validates :image, presence: true, blob: { content_type: ['image/png', 'image/jpeg', 'image/gif', 'image/heic', 'image/heif'], size_range: 1..(10.megabytes) }
end
