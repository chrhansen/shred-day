FactoryBot.define do
  factory :photo_import do
    association :user
    status { 0 } # processing
  end
end
