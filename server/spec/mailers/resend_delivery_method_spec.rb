require "rails_helper"

RSpec.describe ResendDeliveryMethod do
  describe "#deliver!" do
    it "posts the email through Resend's HTTP API" do
      mail = Mail.new do
        from "Shred Day <hello@shred.day>"
        to "ops@shred.day"
        subject "New user signup - Shred Day"
        html_part do
          content_type "text/html; charset=UTF-8"
          body "<p>Hello</p>"
        end
      end

      http = instance_double(Net::HTTP)
      response = instance_double(
        Net::HTTPSuccess,
        body: '{"id":"08de3f0f-5f23-4b5e-a70f-8d0a6f4a4d77"}',
        code: "200"
      )
      allow(response).to receive(:is_a?).with(Net::HTTPSuccess).and_return(true)

      captured_request = nil
      allow(http).to receive(:request) do |request|
        captured_request = request
        response
      end
      allow(Net::HTTP).to receive(:start).with("api.resend.com", 443, use_ssl: true).and_yield(http)

      described_class.new(api_key: "re_test_123").deliver!(mail)

      expect(captured_request["Content-Type"]).to eq("application/json")
      expect(captured_request["Authorization"]).to eq("Bearer re_test_123")

      payload = JSON.parse(captured_request.body)
      expect(payload).to include(
        "from" => "Shred Day <hello@shred.day>",
        "subject" => "New user signup - Shred Day",
        "html" => "<p>Hello</p>"
      )
      expect(payload.fetch("to")).to eq(["ops@shred.day"])
    end

    it "raises when Resend does not return success" do
      mail = Mail.new do
        from "Shred Day <hello@shred.day>"
        to "ops@shred.day"
        subject "New user signup - Shred Day"
        body "<p>Hello</p>"
      end

      http = instance_double(Net::HTTP)
      response = instance_double(Net::HTTPBadRequest, body: '{"Error":"bad"}', code: "400")
      allow(response).to receive(:is_a?).with(Net::HTTPSuccess).and_return(false)

      allow(http).to receive(:request).and_return(response)
      allow(Net::HTTP).to receive(:start).with("api.resend.com", 443, use_ssl: true).and_yield(http)

      expect do
        described_class.new(api_key: "re_test_123").deliver!(mail)
      end.to raise_error("Resend delivery failed (400): {\"Error\":\"bad\"}")
    end

    it "raises when Resend response does not include an id" do
      mail = Mail.new do
        from "Shred Day <hello@shred.day>"
        to "ops@shred.day"
        subject "New user signup - Shred Day"
        body "<p>Hello</p>"
      end

      http = instance_double(Net::HTTP)
      response = instance_double(Net::HTTPSuccess, body: "{}", code: "200")
      allow(response).to receive(:is_a?).with(Net::HTTPSuccess).and_return(true)

      allow(http).to receive(:request).and_return(response)
      allow(Net::HTTP).to receive(:start).with("api.resend.com", 443, use_ssl: true).and_yield(http)

      expect do
        described_class.new(api_key: "re_test_123").deliver!(mail)
      end.to raise_error("Resend delivery failed (200): {}")
    end
  end
end
