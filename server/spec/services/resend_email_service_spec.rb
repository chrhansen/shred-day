require "rails_helper"

RSpec.describe ResendEmailService do
  describe "#send_email" do
    it "returns a failure when the API key is missing" do
      service = described_class.new(api_key: nil, from_email: "from@example.com")

      result = service.send_email(to: "test@example.com", subject: "Hello", html: "<p>Hi</p>")

      expect(result).not_to be_sent
      expect(result.error).to eq("Resend API key missing")
    end

    it "returns a failure when the from email is missing" do
      service = described_class.new(api_key: "test_key", from_email: nil)

      result = service.send_email(to: "test@example.com", subject: "Hello", html: "<p>Hi</p>")

      expect(result).not_to be_sent
      expect(result.error).to eq("Resend from email missing")
    end

    it "returns a failure when the recipient is missing" do
      service = described_class.new(api_key: "test_key", from_email: "from@example.com")

      result = service.send_email(to: nil, subject: "Hello", html: "<p>Hi</p>")

      expect(result).not_to be_sent
      expect(result.error).to eq("Recipient email missing")
    end
  end
end
