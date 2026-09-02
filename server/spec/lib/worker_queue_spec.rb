require "rails_helper"
require_relative "../../db/queue_migrate/20250430193042_solid_queue_setup"

class WorkerProbeJob < ActiveJob::Base
  def perform; end
end

RSpec.describe "Worker queue integration" do
  before(:all) do
    ActiveRecord::Migration.suppress_messages { SolidQueueSetup.new.migrate(:up) } unless SolidQueue::Job.table_exists?
  end

  around do |example|
    original_adapter = ActiveJob::Base.queue_adapter
    ActiveJob::Base.queue_adapter = :solid_queue
    example.run
  ensure
    ActiveJob::Base.queue_adapter = original_adapter
  end

  it "keeps the worker awake across ready, claimed, and completed states" do
    expect(WorkerQueue.pending?).to be false
    job = WorkerProbeJob.perform_later
    record = SolidQueue::Job.find_by!(active_job_id: job.job_id)
    expect(WorkerQueue.pending?).to be true
    record.ready_execution.destroy!
    process = SolidQueue::Process.create!(kind: "Worker", name: "test-worker", pid: Process.pid, last_heartbeat_at: Time.current)
    record.create_claimed_execution!(process: process)
    expect(WorkerQueue.pending?).to be true
    record.claimed_execution.destroy!
    record.update!(finished_at: Time.current)
    expect(WorkerQueue.pending?).to be false
  end

  it "stays awake for imminent jobs and leaves distant retries to hourly recovery" do
    WorkerProbeJob.set(wait: 1.hour).perform_later
    expect(WorkerQueue.pending?).to be false
    WorkerProbeJob.set(wait: 2.minutes).perform_later
    expect(WorkerQueue.pending?).to be true
  end

  it "checks all execution states in one database snapshot" do
    queries = []
    subscriber = ActiveSupport::Notifications.subscribe("sql.active_record") do |event|
      queries << event.payload[:sql] if event.payload[:sql].include?("solid_queue_")
    end
    WorkerQueue.pending?
    expect(queries.size).to eq(1)
  ensure
    ActiveSupport::Notifications.unsubscribe(subscriber)
  end

  it "wakes after ordinary, framework, delayed, and bulk jobs are persisted" do
    persisted_counts = []
    client = instance_double(WorkerWakeClient)
    allow(WorkerWakeClient).to receive(:new).and_return(client)
    allow(client).to receive(:wake) { persisted_counts << SolidQueue::Job.count; true }
    subscriber = WorkerWakeSubscriber.subscribe

    WorkerProbeJob.perform_later
    blob = ActiveStorage::Blob.create_and_upload!(io: StringIO.new("example"), filename: "test.txt", identify: false)
    ActiveStorage::AnalyzeJob.perform_later(blob)
    WorkerProbeJob.set(wait: 1.minute).perform_later
    ActiveJob.perform_all_later(WorkerProbeJob.new, WorkerProbeJob.new)

    expect(persisted_counts).to eq([ 1, 2, 3, 5 ])
  ensure
    ActiveSupport::Notifications.unsubscribe(subscriber)
  end

  it "does not install the wake hook in worker mode" do
    original = ENV["WAKE_WORKER_ON_ENQUEUE"]
    ENV["WAKE_WORKER_ON_ENQUEUE"] = "false"
    expect(WorkerWakeSubscriber).not_to receive(:subscribe)
    load Rails.root.join("config/initializers/worker_wake.rb")
  ensure
    ENV["WAKE_WORKER_ON_ENQUEUE"] = original
  end
end
