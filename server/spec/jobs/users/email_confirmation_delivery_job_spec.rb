require "rails_helper"

RSpec.describe Users::EmailConfirmationDeliveryJob, type: :job do
  include ActiveJob::TestHelper

  let(:user) { create(:user, :unconfirmed) }

  before do
    @previous_adapter = ActiveJob::Base.queue_adapter
    ActiveJob::Base.queue_adapter = :test
    ActionMailer::Base.deliveries.clear
    clear_enqueued_jobs
  end

  after do
    clear_enqueued_jobs
    ActiveJob::Base.queue_adapter = @previous_adapter
  end

  def request_delivery
    Users::EmailConfirmationService.new.send_confirmation(user)
    enqueued_jobs.find { |job| job[:job] == described_class }[:args]
  end

  it "queues only an encrypted envelope and keeps raw credentials out of persisted user attributes" do
    args = request_delivery
    payload = Users::EmailConfirmationService.encryptor.decrypt_and_verify(args.last)
    expect(args.first).to eq(user.id)
    expect(args.last).not_to include(payload.fetch("token"))
    expect(user.reload.attributes.values).not_to include(payload.fetch("token"))
    expect(user.email_confirmation_token_digest).to eq(Digest::SHA256.hexdigest(payload.fetch("token")))
    expect(described_class.log_arguments).to be(false)

    described_class.perform_now(*args)
    expect(ActionMailer::Base.deliveries.last.to).to eq([user.email])
    link = ActionMailer::Base.deliveries.last.text_part.body.decoded
    expect(link).to include("https://example.com/confirm-email#token=")
    expect(link).not_to include("?token=")
  end

  it "does not deliver a stale token, a changed-recipient token, or a confirmed account token" do
    args = request_delivery
    user.update_columns(email_confirmation_token_digest: "stale")
    expect { described_class.perform_now(*args) }.not_to change(ActionMailer::Base.deliveries, :count)
    user.update_columns(email_confirmation_sent_at: nil)
    args = request_delivery
    user.update_columns(email: "changed@example.com")
    expect { described_class.perform_now(*args) }.not_to change(ActionMailer::Base.deliveries, :count)
    user.reload.update_columns(email_confirmation_sent_at: nil)
    args = request_delivery
    user.update_columns(password_confirmed_at: Time.current)
    expect { described_class.perform_now(*args) }.not_to change(ActionMailer::Base.deliveries, :count)
  end

  it "sanitizes delivery exceptions before Active Job retries or logs them" do
    args = request_delivery
    delivery = instance_double(ActionMailer::MessageDelivery)
    parameterized = double("Parameterized mailer")
    allow(EmailConfirmationMailer).to receive(:with).and_return(parameterized)
    allow(parameterized).to receive(:confirmation).and_return(delivery)
    allow(delivery).to receive(:deliver_now).and_raise(StandardError, "sensitive-provider-body")
    expect { described_class.new.perform(*args) }.to raise_error(described_class::DeliveryError) { |error|
      expect(error.message).to eq("Confirmation email delivery failed")
      expect(error.cause).to be_nil
    }
  end
end
