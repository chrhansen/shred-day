require "active_support/security_utils"

class WorkerHttpApp
  def initialize(lifecycle:, token:)
    @lifecycle = lifecycle
    @token = token
    raise ArgumentError, "Worker wake token must be configured" if token.to_s.empty?
  end

  def call(env)
    if env["REQUEST_METHOD"] == "GET" && env["PATH_INFO"] == "/up"
      response(@lifecycle.draining? ? 503 : 200)
    elsif env["REQUEST_METHOD"] == "POST" && env["PATH_INFO"] == "/wake"
      return response(401) unless ActiveSupport::SecurityUtils.secure_compare(
        env["HTTP_AUTHORIZATION"].to_s, "Bearer #{@token}")
      response(@lifecycle.wake ? 202 : 503)
    else
      response(404)
    end
  end

  private

  def response(status)
    [ status, { "content-type" => "text/plain", "cache-control" => "no-store" }, [ "#{status}\n" ] ]
  end
end
