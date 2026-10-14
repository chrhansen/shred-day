require "json"

raise "Test fixtures only" unless Rails.env.test?
config = ActiveRecord::Base.connection_db_config
raise "Local test database required" unless config.database == "shred_day_test" && %w[127.0.0.1 localhost ::1].include?(config.host)
raise "Test mail delivery required" unless ActionMailer::Base.delivery_method == :test
params = JSON.parse(STDIN.read(4097))
email = params.fetch("email")
raise "Synthetic fixture required" unless email.match?(/\A[a-z0-9._+-]+@example\.(com|test)\z/i)
user = User.transaction do
  created = User.create!(email: email, password: params.fetch("password"),
    email_confirmed_at: Time.current, password_confirmed_at: Time.current)
  EnsureDefaultTagsService.new(created).create_default_tags
  created
end
STDOUT.write("CYPRESS_FIXTURE_START" + JSON.generate({ id: user.id, email: user.email }) + "CYPRESS_FIXTURE_END")
