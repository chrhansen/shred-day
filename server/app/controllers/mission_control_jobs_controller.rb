class MissionControlJobsController < ActionController::Base
  # Mission Control handles its own basic auth; skip the API auth enforced in ApplicationController.
  skip_forgery_protection
end
