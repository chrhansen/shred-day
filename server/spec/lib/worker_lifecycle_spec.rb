require "spec_helper"
require_relative "../../lib/worker_lifecycle"

RSpec.describe WorkerLifecycle do
  let(:pending) { false }
  let(:clock) { double(call: 0) }
  subject(:lifecycle) { described_class.new(pending_work: -> { pending }, idle_seconds: 60, clock: clock) }

  before { lifecycle }

  it "stops only after the idle period and refuses wakes while draining" do
    allow(clock).to receive(:call).and_return(59)
    expect(lifecycle.drain_if_idle).to be false
    allow(clock).to receive(:call).and_return(60)
    expect(lifecycle.drain_if_idle).to be true
    expect(lifecycle.wake).to be false
    expect(lifecycle.drain_if_idle).to be false
  end

  it "extends the idle period when a new wake arrives" do
    allow(clock).to receive(:call).and_return(59)
    expect(lifecycle.wake).to be true
    allow(clock).to receive(:call).and_return(60)
    expect(lifecycle.drain_if_idle).to be false
    allow(clock).to receive(:call).and_return(119)
    expect(lifecycle.drain_if_idle).to be true
  end

  it "keeps running while work exists, regardless of elapsed time" do
    allow(clock).to receive(:call).and_return(3600)
    allow(self).to receive(:pending).and_return(true)
    expect(lifecycle.drain_if_idle).to be false
    allow(self).to receive(:pending).and_return(false)
    expect(lifecycle.drain_if_idle).to be false
  end

  it "does not enter draining state when the database check fails" do
    lifecycle = described_class.new(pending_work: -> { raise IOError }, idle_seconds: 0)
    expect { lifecycle.drain_if_idle }.to raise_error(IOError)
    expect(lifecycle.wake).to be true
  end

  it "rejects a wake racing with the final empty-queue check so the caller can retry" do
    checking = Queue.new
    continue = Queue.new
    lifecycle = described_class.new(idle_seconds: 0, pending_work: -> { checking << true; continue.pop; false })
    draining = Thread.new { lifecycle.drain_if_idle }
    checking.pop
    waking = Thread.new { lifecycle.wake }
    continue << true
    expect(draining.value).to be true
    expect(waking.value).to be false
  end
end
