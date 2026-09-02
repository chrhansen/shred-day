require_relative "environment"

workers 0
raise_exception_on_sigterm false
threads 1, 3
bind "tcp://0.0.0.0:8080"
plugin :solid_queue

lifecycle = WorkerLifecycle.new(
  idle_seconds: Integer(ENV.fetch("WORKER_IDLE_SECONDS", "60")),
  pending_work: -> { WorkerQueue.pending? }
)
app WorkerHttpApp.new(lifecycle: lifecycle, token: ENV.fetch("WORKER_WAKE_TOKEN"))

on_booted do
  Thread.new do
    loop do
      sleep 5
      begin
        idle = Rails.application.executor.wrap { lifecycle.drain_if_idle }
        if idle
          Rails.logger.info("Worker queue drained; stopping idle Machine")
          Process.kill("TERM", Process.pid)
          break
        end
      rescue StandardError => error
        Rails.logger.error("Worker idle check failed: #{error.class}")
      end
    end
  end
end
