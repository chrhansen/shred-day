FactoryBot.define do
  factory :text_import do
    user
    status { :waiting }
    original_text { nil }

    trait :with_text do
      original_text { "2024-01-15 Aspen Mountain\n2024-01-16 Vail Resort" }
    end

    trait :processing do
      status { :processing }
    end

    trait :committed do
      status { :committed }
    end

    trait :failed do
      status { :failed }
    end
  end
end