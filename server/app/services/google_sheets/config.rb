module GoogleSheets
  SCOPES = [
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/spreadsheets"
  ].freeze

  module Config
    module_function

    def client_id
      Rails.application.credentials.dig(:google, :client_id)
    end

    def client_secret
      Rails.application.credentials.dig(:google, :client_secret)
    end

    def redirect_uri
      if Rails.env.production?
        "https://#{Rails.application.default_url_options[:host]}/integrations/google/callback"
      else
        "http://#{Rails.application.default_url_options[:host]}:8080/integrations/google/callback"
      end
    end
  end
end
