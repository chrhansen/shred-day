require "rails_helper"

RSpec.describe MailjetDeliveryMethod do
  describe "#deliver!" do
    it "posts the email through Mailjet's HTTP API" do
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
        body: '{"Messages":[{"Status":"success"}]}',
        code: "200"
      )
      allow(response).to receive(:is_a?).with(Net::HTTPSuccess).and_return(true)

      captured_request = nil
      allow(http).to receive(:request) do |request|
        captured_request = request
        response
      end
      allow(Net::HTTP).to receive(:start).with("api.mailjet.com", 443, use_ssl: true).and_yield(http)

      described_class.new(api_key: "mailjet-key", secret_key: "mailjet-secret").deliver!(mail)

      expect(captured_request["Content-Type"]).to eq("application/json")
      expect(captured_request["Authorization"]).to start_with("Basic ")

      payload = JSON.parse(captured_request.body)
      message = payload.fetch("Messages").first

      expect(message).to include(
        "Subject" => "New user signup - Shred Day",
        "HTMLPart" => "<p>Hello</p>"
      )
      expect(message.fetch("From")).to eq({ "Email" => "hello@shred.day", "Name" => "Shred Day" })
      expect(message.fetch("To")).to eq([{ "Email" => "ops@shred.day" }])
    end

    it "raises when Mailjet does not return success" do
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
      allow(Net::HTTP).to receive(:start).with("api.mailjet.com", 443, use_ssl: true).and_yield(http)

      expect do
        described_class.new(api_key: "mailjet-key", secret_key: "mailjet-secret").deliver!(mail)
      end.to raise_error("Mailjet delivery failed (400): {\"Error\":\"bad\"}")
    end
  end
end
