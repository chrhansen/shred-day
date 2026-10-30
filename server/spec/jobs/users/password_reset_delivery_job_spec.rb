require "rails_helper"

RSpec.describe Users::PasswordResetDeliveryJob, type: :job do
  include ActiveJob::TestHelper
  let(:user) { create(:user) }

  around do |example|
    previous_adapter = ActiveJob::Base.queue_adapter
    ActiveJob::Base.queue_adapter = :test
    ActionMailer::Base.deliveries.clear
    clear_enqueued_jobs
    example.run
  ensure
    clear_enqueued_jobs
    ActiveJob::Base.queue_adapter = previous_adapter
  end

  def request_delivery
    Users::PasswordResetService.new.request_reset(user.email)
    enqueued_jobs.find { |job| job[:job] == described_class }[:args]
  end

  it "queues encrypted credentials, stores only a digest and disables argument logging" do
    args = request_delivery
    payload = Users::PasswordResetService.encryptor.decrypt_and_verify(args.last)
    expect(args.first).to eq(user.id)
    expect(args.last).not_to include(payload.fetch("token"))
    expect(user.reload.attributes.values).not_to include(payload.fetch("token"))
    expect(user.password_reset_token_digest).to eq(Digest::SHA256.hexdigest(payload.fetch("token")))
    expect(described_class.log_arguments).to be(false)
    expect(described_class.enqueue_after_transaction_commit).to be(true)
    described_class.perform_now(*args)
    mail = ActionMailer::Base.deliveries.last
    expect(mail.to).to eq([ user.email ])
    expect(mail.text_part.body.decoded).to include("https://example.com/reset-password#token=")
    expect(mail.html_part.body.decoded).to include("expires in one hour")
  end

  [
    { password_reset_token_digest: "stale" }, { password_reset_token_digest: nil },
    { password_reset_expires_at: 1.hour.ago }, { password_session_version: 1 },
    { email: "changed@example.com" }
  ].each do |changes|
    it "skips stale or obsolete delivery (#{changes.keys.join(', ')})" do
      args = request_delivery
      user.update_columns(changes)
      expect { described_class.perform_now(*args) }.not_to change(ActionMailer::Base.deliveries, :count)
    end
  end

  it "ignores deleted accounts and invalid envelopes" do
    expect { described_class.perform_now("usr_missing", "invalid") }.not_to change(ActionMailer::Base.deliveries, :count)
    expect { described_class.perform_now(user.id, "invalid") }.not_to change(ActionMailer::Base.deliveries, :count)
  end

  it "sanitizes provider exceptions before retrying or logging" do
    args = request_delivery
    delivery = instance_double(ActionMailer::MessageDelivery)
    parameterized = double("Parameterized mailer", reset: delivery)
    allow(PasswordResetMailer).to receive(:with).and_return(parameterized)
    allow(delivery).to receive(:deliver_now).and_raise(StandardError, "sensitive-provider-body")
    expect { described_class.new.perform(*args) }.to raise_error(described_class::DeliveryError) { |error|
      expect(error.message).to eq("Password reset email delivery failed")
      expect(error.cause).to be_nil
    }
  end
end
