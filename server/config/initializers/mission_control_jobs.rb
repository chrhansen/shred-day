user = ENV["MISSION_CONTROL_JOBS_USER"] || Rails.application.credentials.dig(:mission_control, :http_basic_auth_user)
password = ENV["MISSION_CONTROL_JOBS_PASSWORD"] || Rails.application.credentials.dig(:mission_control, :http_basic_auth_password)

if user.present? && password.present?
  MissionControl::Jobs.http_basic_auth_user = user
  MissionControl::Jobs.http_basic_auth_password = password
  MissionControl::Jobs.base_controller_class = "MissionControlJobsController"
else
  Rails.logger.warn("Mission Control Jobs basic auth is not configured; dashboard will be inaccessible") if Rails.logger
end
