# spec/factories/days.rb
FactoryBot.define do
  factory :day do
    date { Date.today } # Default to today's date
    association :user # Associate with user factory
    association :resort # Associate with resort factory
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

    trait :with_tags do
      transient do
        tag_names { [] }
      end

      after(:create) do |day, evaluator|
        evaluator.tag_names.each do |tag_name|
          tag = day.user.tags.find_or_create_by!(name: tag_name)
          TagDay.find_or_create_by!(day: day, tag: tag)
        end
      end
    end
  end
end
