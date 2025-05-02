# Be sure to restart your server when you modify this file.

# Avoid CORS issues when API is called from the frontend app.
# Handle Cross-Origin Resource Sharing (CORS) in order to accept cross-origin Ajax requests.

# Read more: https://github.com/cyu/rack-cors

Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    # Define allowed origins based on environment
    allowed_origins = if Rails.env.production?
                        # Add your production frontend origin(s) here
                        ["https://www.shred.day", "https://shred.day", "http://localhost:8080", "http://127.0.0.1:8080", "http://localhost:3000", "http://127.0.0.1:3000"]
                      else
                        # Development origins
                        ["http://localhost:8080", "http://127.0.0.1:8080"]
                      end

    origins allowed_origins

    # Allow all standard HTTP methods and headers, and allow credentials
    resource "*",
      headers: :any,
      methods: [:get, :post, :put, :patch, :delete, :options, :head],
      credentials: true # Important for sending session cookies
  end
end
