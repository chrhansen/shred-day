api_key = Rails.application.credentials.dig(:resend, :api_key)

Resend.api_key = api_key
Rails.application.config.action_mailer.resend_settings = { api_key: api_key }
