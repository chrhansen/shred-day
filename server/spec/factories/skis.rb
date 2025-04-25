# spec/factories/skis.rb
FactoryBot.define do
  factory :ski do
    sequence(:name) { |n| "Test Ski #{n}" }
    user # Associate with a user factory
  end
end
