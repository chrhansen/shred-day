# spec/factories/users.rb
FactoryBot.define do
  factory :user do
    # Use sequence for unique emails
    sequence(:email) { |n| "user#{n}@example.com" }
    password { "password123" } # Default password for tests
    email_confirmed_at { Time.current }
    password_confirmed_at { Time.current }

    trait :unconfirmed do
      email_confirmed_at { nil }
      password_confirmed_at { nil }
    end
  end
end
