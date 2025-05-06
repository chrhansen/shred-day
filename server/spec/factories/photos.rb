FactoryBot.define do
  factory :photo do
    association :user # Associate with user factory
  end
end
