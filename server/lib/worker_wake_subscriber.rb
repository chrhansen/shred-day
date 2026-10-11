class WorkerWakeSubscriber
  def self.subscribe
    ActiveSupport::Notifications.subscribe(/\Aenqueue(?:_at|_all)?\.active_job\z/) do |event|
      next if event.payload[:exception_object] || event.payload[:exception] || event.payload[:aborted]
      next unless event.payload[:adapter].is_a?(ActiveJob::QueueAdapters::SolidQueueAdapter)

      WorkerWakeClient.new(logger: Rails.logger).wake
    end
  end
end
