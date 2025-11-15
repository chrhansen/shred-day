FactoryBot.define do
  factory :tag do
    association :user
    sequence(:name) { |n| "Tag #{n}" }
  end
end
