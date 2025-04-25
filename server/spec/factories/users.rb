# spec/factories/users.rb
FactoryBot.define do
  factory :user do
    # Use sequence for unique emails
    sequence(:email) { |n| "user#{n}@example.com" }
    password { "password123" } # Default password for tests
  end
end
