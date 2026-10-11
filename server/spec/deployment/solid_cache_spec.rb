require "rails_helper"
require "active_support/cache/solid_cache_store"

RSpec.describe "Production Solid Cache schema" do
  include ActiveSupport::Testing::TimeHelpers

  let(:store) { ActiveSupport::Cache::SolidCacheStore.new }

  before do
    path = Rails.application.config.database_configuration.dig("production", "cache", "migrations_paths")
    ActiveRecord::Migration.suppress_messages do
      ActiveRecord::MigrationContext.new(Rails.root.join(path)).migrate
    end
    SolidCache::Entry.reset_column_information
  end

  after { SolidCache::Entry.reset_column_information }

  it "shares provider keysets between cache store instances" do
    keys = { "keys" => [ { "kid" => "test-key" } ] }
    expect(store.write("mobile-apple-sign-in-jwks", keys, expires_in: 1.hour)).to be true
    expect(ActiveSupport::Cache::SolidCacheStore.new.read("mobile-apple-sign-in-jwks")).to eq(keys)
  end

  it "persists authentication counters and starts a new window after expiry" do
    10.times do |index|
      expect(store.increment("rate-limit:mobile-sign-in:127.0.0.1", 1, expires_in: 1.minute)).to eq(index + 1)
    end
    expect(store.increment("rate-limit:mobile-sign-in:127.0.0.1", 1, expires_in: 1.minute)).to eq(11)

    travel 2.minutes do
      expect(store.increment("rate-limit:mobile-sign-in:127.0.0.1", 1, expires_in: 1.minute)).to eq(1)
    end
  end
end
