require Rails.root.join("app/mailers/resend_delivery_method")

resend_api_key = Rails.application.credentials.dig(:resend, :api_key)

ActionMailer::Base.add_delivery_method(
  :resend_api,
  ResendDeliveryMethod,
  api_key: resend_api_key
)
