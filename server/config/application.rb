require_relative "boot"

require "rails/all"

# Require the gems listed in Gemfile, including any gems
# you've limited to :test, :development, or :production.
Bundler.require(*Rails.groups)

module Server
  class Application < Rails::Application
    # Initialize configuration defaults for originally generated Rails version.
    config.load_defaults 8.0

    # Please, add to the `ignore` list any other `lib` subdirectories that do
    # not contain `.rb` files, or that should not be reloaded or eager loaded.
    # Common ones are `templates`, `generators`, or `middleware`, for example.
    config.autoload_lib(ignore: %w[assets tasks])


    # use SQL based schema instead of schema.rb
    config.active_record.schema_format = :sql
    # Configuration for the application, engines, and railties goes here.
    #
    # These settings can be overridden in specific environments using the files
    # in config/environments, which are processed later.
    #
    # config.time_zone = "Central Time (US & Canada)"
    # config.eager_load_paths << Rails.root.join("extras")

    # Only loads a smaller set of middleware suitable for API only apps.
    # Middleware like session, flash, cookies can be added back manually.
    # Skip views, helpers and assets when generating a new resource.
    config.api_only = true

    # === Enable session management ===
    # Use cookie store for sessions (requires ActionDispatch::Cookies)
    # Add expire_after for 1 month duration
    config.session_store :cookie_store, key: '_shred_day_session',
                                      expire_after: 30.days,
                                      same_site: :lax,
                                      secure: Rails.env.production?
    # Use ActionDispatch::Cookies to manage cookies
    config.middleware.use ActionDispatch::Cookies
    # Use the session store defined above
    config.middleware.use config.session_store, config.session_options
  end
end
