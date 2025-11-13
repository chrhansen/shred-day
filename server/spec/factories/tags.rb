FactoryBot.define do
  factory :tag do
    association :user
    sequence(:name) { |n| "Label #{n}" }
  end
end
