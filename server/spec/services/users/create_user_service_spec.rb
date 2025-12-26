require "rails_helper"

RSpec.describe Users::CreateUserService do
  include ActiveJob::TestHelper

  let(:params) { { email: "NewUser@Example.com", password: "password123" } }
  let(:tags_service) { instance_double(EnsureDefaultTagsService, create_default_tags: true) }

  before do
    ActiveJob::Base.queue_adapter = :test
    allow(EnsureDefaultTagsService).to receive(:new).and_return(tags_service)
  end

  after do
    clear_enqueued_jobs
  end

  it "creates a user with a normalized email" do
    result = nil
    expect { result = described_class.new(params).create_user }
      .to have_enqueued_mail(UserMailer, :signup_notification)

    expect(result).to be_created
    expect(result.user.email).to eq("newuser@example.com")
    expect(EnsureDefaultTagsService).to have_received(:new).with(result.user)
  end

  it "returns errors when the user is invalid" do
    invalid_params = { email: "bad-email", password: "short" }

    result = nil
    expect { result = described_class.new(invalid_params).create_user }
      .not_to have_enqueued_mail(UserMailer, :signup_notification)

    expect(result).not_to be_created
    expect(result.errors).not_to be_empty
    expect(EnsureDefaultTagsService).not_to have_received(:new)
  end
end
