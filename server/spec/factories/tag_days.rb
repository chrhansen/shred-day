FactoryBot.define do
  factory :tag_day do
    association :day
    association :tag
  end
end
