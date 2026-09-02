require "spec_helper"
require_relative "../../lib/worker_lifecycle"
require_relative "../../lib/worker_http_app"

RSpec.describe WorkerHttpApp do
  let(:lifecycle) { WorkerLifecycle.new(pending_work: -> { false }, idle_seconds: 0) }
  subject(:app) { described_class.new(lifecycle: lifecycle, token: "test-worker-token") }

  it "rejects unauthenticated and incorrect tokens without waking the worker" do
    expect(lifecycle).not_to receive(:wake)
    [ nil, "Bearer incorrect" ].each do |authorization|
      expect(app.call("REQUEST_METHOD" => "POST", "PATH_INFO" => "/wake", "HTTP_AUTHORIZATION" => authorization).first).to eq(401)
    end
  end

  it "accepts authenticated wake requests" do
    expect(app.call("REQUEST_METHOD" => "POST", "PATH_INFO" => "/wake", "HTTP_AUTHORIZATION" => "Bearer test-worker-token").first).to eq(202)
  end

  it "returns 503 for wakes during shutdown" do
    lifecycle.drain_if_idle
    expect(app.call("REQUEST_METHOD" => "POST", "PATH_INFO" => "/wake", "HTTP_AUTHORIZATION" => "Bearer test-worker-token").first).to eq(503)
  end

  it "does not reset the idle timer for health checks" do
    expect(lifecycle).not_to receive(:wake)
    expect(app.call("REQUEST_METHOD" => "GET", "PATH_INFO" => "/up").first).to eq(200)
    expect(lifecycle.drain_if_idle).to be true
    expect(app.call("REQUEST_METHOD" => "GET", "PATH_INFO" => "/up").first).to eq(503)
  end

  it "exposes no application routes" do
    expect(app.call("REQUEST_METHOD" => "GET", "PATH_INFO" => "/api/v1/users").first).to eq(404)
  end
end
