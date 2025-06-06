FactoryBot.define do
  factory :draft_day do
    association :photo_import
    association :resort
    decision { 0 } # pending
    date { Date.today }
    text_import { nil }

    trait :with_text_import do
      photo_import { nil }
      association :text_import
    end

    trait :with_photo_import do
      text_import { nil }
      association :photo_import
    end
  end
end
