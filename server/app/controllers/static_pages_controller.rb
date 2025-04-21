# This controller handles serving the static frontend application.
# It inherits from ActionController::Base to ensure full rendering capabilities
# required for serving the index.html file, unlike ActionController::API.
class StaticPagesController < ActionController::Base
  # Action to serve the frontend's index.html
  # Assumes the frontend build is in the Rails public directory
  def frontend
    # Using Rails.public_path ensures we correctly locate the public directory
    # regardless of the application's root or deployment structure.
    render file: Rails.public_path.join('index.html'), layout: false
  end
end
