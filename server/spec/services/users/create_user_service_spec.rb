require "rails_helper"

RSpec.describe Users::CreateUserService do
  let(:params) { { email: "NewUser@Example.com", password: "password123" } }
  let(:tags_service) { instance_double(EnsureDefaultTagsService, create_default_tags: true) }
  let(:notification_result) { instance_double(Notifications::UserSignedUpEmailService::Result, sent?: true, error: nil) }
  let(:notification_service) { instance_double(Notifications::UserSignedUpEmailService, send_notification: notification_result) }

  before do
    allow(EnsureDefaultTagsService).to receive(:new).and_return(tags_service)
    allow(Notifications::UserSignedUpEmailService).to receive(:new).and_return(notification_service)
  end

  it "creates a user with a normalized email" do
    result = described_class.new(params).create_user

    expect(result).to be_created
    expect(result.user.email).to eq("newuser@example.com")
    expect(EnsureDefaultTagsService).to have_received(:new).with(result.user)
    expect(notification_service).to have_received(:send_notification)
  end

  it "returns errors when the user is invalid" do
    invalid_params = { email: "bad-email", password: "short" }

    result = described_class.new(invalid_params).create_user

    expect(result).not_to be_created
    expect(result.errors).not_to be_empty
    expect(EnsureDefaultTagsService).not_to have_received(:new)
    expect(Notifications::UserSignedUpEmailService).not_to have_received(:new)
  end
end
