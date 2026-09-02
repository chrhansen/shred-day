class WorkerLifecycle
  def initialize(pending_work:, idle_seconds:, clock: -> { Process.clock_gettime(Process::CLOCK_MONOTONIC) })
    @pending_work = pending_work
    @idle_seconds = idle_seconds
    @clock = clock
    @last_activity = @clock.call
    @draining = false
    @mutex = Mutex.new
  end

  def wake
    @mutex.synchronize do
      return false if @draining
      @last_activity = @clock.call
      true
    end
  end

  def drain_if_idle
    @mutex.synchronize do
      return false if @draining
      if @pending_work.call
        @last_activity = @clock.call
        return false
      end
      return false if @clock.call - @last_activity < @idle_seconds
      @draining = true
    end
  end

  def draining?
    @mutex.synchronize { @draining }
  end
end
