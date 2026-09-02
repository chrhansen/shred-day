if ENV["WAKE_WORKER_ON_ENQUEUE"] == "true"
  Rails.application.config.after_initialize do
    WorkerWakeSubscriber.subscribe
  end
end
