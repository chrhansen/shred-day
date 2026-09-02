class WorkerQueue
  def self.pending?
    SolidQueue::Job.left_joins(:ready_execution, :claimed_execution, :blocked_execution, :scheduled_execution)
      .where(<<~SQL, 5.minutes.from_now).exists?
        solid_queue_ready_executions.id IS NOT NULL OR
        solid_queue_claimed_executions.id IS NOT NULL OR
        solid_queue_blocked_executions.id IS NOT NULL OR
        solid_queue_scheduled_executions.scheduled_at <= ?
      SQL
  end
end
