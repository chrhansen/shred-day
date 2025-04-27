# spec/factories/days.rb
FactoryBot.define do
  factory :day do
    date { Date.today } # Default to today's date
    association :user # Associate with user factory
    association :ski # Associate with ski factory
    association :resort # Associate with resort factory
    activity { "Test Activity" } # Add a default activity if needed/desired
  end
end
