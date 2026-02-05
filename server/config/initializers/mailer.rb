require Rails.root.join("app/mailers/mailjet_delivery_method")

mailjet_api_key = Rails.application.credentials.dig(:mailjet, :api_key)
mailjet_secret_key = Rails.application.credentials.dig(:mailjet, :secret_key)

ActionMailer::Base.add_delivery_method(
  :mailjet_api,
  MailjetDeliveryMethod,
  api_key: mailjet_api_key,
  secret_key: mailjet_secret_key
)
