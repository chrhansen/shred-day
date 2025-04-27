# spec/factories/skis.rb
FactoryBot.define do
  factory :ski do
    sequence(:name) { |n| "Test Ski #{n}" }
    association :user # Add association to user factory
  end
end
