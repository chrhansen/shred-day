MissionControl::Jobs.base_controller_class = "MissionControlJobsController"

user = ENV["MISSION_CONTROL_BASIC_AUTH_USER"]
password = ENV["MISSION_CONTROL_BASIC_AUTH_PASSWORD"]
missing_master_key = false

if user.blank? || password.blank?
  begin
    credentials = Rails.application.credentials[:mission_control] || {}
    user ||= credentials[:http_basic_auth_user]
    password ||= credentials[:http_basic_auth_password]
  rescue ActiveSupport::EncryptedFile::MissingKeyError
    missing_master_key = true
  end
end

if user.present? && password.present?
  MissionControl::Jobs.http_basic_auth_user = user
  MissionControl::Jobs.http_basic_auth_password = password
elsif missing_master_key
  Rails.logger&.warn("Mission Control Jobs basic auth skipped: master key missing during build")
else
  Rails.logger&.warn("Mission Control Jobs basic auth is not configured; dashboard will be inaccessible")
end
