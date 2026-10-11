require "spec_helper"
require_relative "../../lib/worker_wake_client"

RSpec.describe WorkerWakeClient do
  subject(:client) { described_class.new(url: "http://worker.flycast/wake", token: "test-token", timeout: 10, clock: -> { @time }) }
  let(:http) { double }

  before do
    @time = 0
    allow(Net::HTTP).to receive(:start).and_yield(http)
    allow(http).to receive(:max_retries=)
    allow(client).to receive(:sleep) { |seconds| @time += seconds }
  end

  it "authenticates the private wake request" do
    expect(http).to receive(:request) do |request|
      expect(request.path).to eq("/wake")
      expect(request["Authorization"]).to eq("Bearer test-token")
      Net::HTTPAccepted.new("1.1", "202", "Accepted")
    end
    expect(client.wake).to be true
  end

  it "retries when the worker is draining then accepts its cold start" do
    expect(http).to receive(:request).exactly(4).times.ordered.and_return(Net::HTTPServiceUnavailable.new("1.1", "503", "Unavailable"))
    expect(http).to receive(:request).ordered.and_return(Net::HTTPAccepted.new("1.1", "202", "Accepted"))
    expect(client.wake).to be true
  end

  it "bounds retries for an unavailable worker without losing the queued job" do
    expect(http).to receive(:request).exactly(5).times.and_raise(Net::ReadTimeout)
    expect(client.wake).to be false
  end

  it "does not retry invalid credentials" do
    expect(http).to receive(:request).once.and_return(Net::HTTPUnauthorized.new("1.1", "401", "Unauthorized"))
    expect(client.wake).to be false
  end
end
