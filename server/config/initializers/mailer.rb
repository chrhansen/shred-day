Rails.application.config.action_mailer.resend_settings = {
  api_key: Rails.application.credentials.dig(:resend, :api_key)
}
