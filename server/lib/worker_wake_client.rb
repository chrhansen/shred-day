require "net/http"
require "uri"

class WorkerWakeClient
  def initialize(url: ENV.fetch("WORKER_WAKE_URL"), token: ENV.fetch("WORKER_WAKE_TOKEN"), logger: nil,
    timeout: 45, clock: -> { Process.clock_gettime(Process::CLOCK_MONOTONIC) })
    @uri = URI(url)
    @token = token
    @logger = logger
    @timeout = timeout
    @clock = clock
  end

  def wake
    deadline = @clock.call + @timeout
    while (remaining = deadline - @clock.call) > 0
      begin
        response = Net::HTTP.start(@uri.host, @uri.port, nil, use_ssl: @uri.scheme == "https",
          open_timeout: [ 5, remaining ].min, read_timeout: [ 15, remaining ].min,
          write_timeout: [ 5, remaining ].min) do |http|
          http.max_retries = 0
          request = Net::HTTP::Post.new(@uri.request_uri)
          request["Authorization"] = "Bearer #{@token}"
          http.request(request)
        end
        return true if response.is_a?(Net::HTTPSuccess)
        @logger&.warn("Worker wake returned HTTP #{response.code}")
        return false if response.code == "401"
      rescue IOError, SystemCallError, Timeout::Error, SocketError => error
        @logger&.warn("Worker wake failed: #{error.class}")
      end
      remaining = deadline - @clock.call
      sleep [ 2, remaining ].min if remaining > 0
    end
    false
  end
end
