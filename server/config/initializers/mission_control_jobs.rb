MissionControl::Jobs.base_controller_class = "MissionControlJobsController"

user = Rails.application.credentials.dig(:mission_control, :http_basic_auth_user)
password = Rails.application.credentials.dig(:mission_control, :http_basic_auth_password)

if user.present? && password.present?
  MissionControl::Jobs.http_basic_auth_user = user
  MissionControl::Jobs.http_basic_auth_password = password
else
  Rails.logger.warn("Mission Control Jobs basic auth is not configured; dashboard will be inaccessible") if Rails.logger
end
