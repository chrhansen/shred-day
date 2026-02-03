require "rails_helper"

RSpec.describe UserMailer, type: :mailer do
  describe "#signup_notification" do
    it "renders the headers and body" do
      user = create(:user, email: "newuser@example.com")

      mail = described_class.signup_notification(user)

      expect(mail.subject).to eq("New user signup - Shred Day")
      expect(mail.to).to eq([ApplicationMailer::DEFAULT_NOTIFICATION_EMAIL])
      expect(mail[:from].value).to eq(ApplicationMailer::DEFAULT_FROM_EMAIL)
      expect(mail.body.encoded).to include("newuser@example.com")
    end
  end

  describe "#day_created_notification" do
    it "renders the headers and body" do
      day = create(:day)

      mail = described_class.day_created_notification(day)

      expect(mail.subject).to eq("New day logged - Shred Day")
      expect(mail.to).to eq([ApplicationMailer::DEFAULT_NOTIFICATION_EMAIL])
      expect(mail[:from].value).to eq(ApplicationMailer::DEFAULT_FROM_EMAIL)
      expect(mail.body.encoded).to include(day.user.email)
    end
  end

  describe "#resort_suggestion_notification" do
    it "renders the headers and body" do
      user = create(:user, email: "suggestor@example.com", full_name: "Ski Buddy")
      resort = create(:resort, name: "Powder Peak", country: "Canada")

      mail = described_class.resort_suggestion_notification(user, resort)

      expect(mail.subject).to eq("Resort suggestion - Shred Day")
      expect(mail.to).to eq([ApplicationMailer::DEFAULT_NOTIFICATION_EMAIL])
      expect(mail[:from].value).to eq(ApplicationMailer::DEFAULT_FROM_EMAIL)
      expect(mail.body.encoded).to include("Ski Buddy")
      expect(mail.body.encoded).to include("Powder Peak")
    end
  end
end
