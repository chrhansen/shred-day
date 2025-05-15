# spec/factories/days.rb
FactoryBot.define do
  factory :day do
    date { Date.today } # Default to today's date
    association :user # Associate with user factory
    association :resort # Associate with resort factory
    activity { "Test Activity" } # Add a default activity if needed/desired

    # Optional: Add a trait to easily create days with skis if needed in many tests
    trait :with_skis do
      transient do
        skis_count { 2 }
      end
      after(:create) do |day, evaluator|
        evaluator.skis_count.times do
          day.skis << create(:ski, user: day.user)
        end
      end
    end
  end
end
