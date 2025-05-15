FactoryBot.define do
  factory :draft_day do
    association :photo_import
    association :resort
    decision { 0 } # pending
    date { Date.today }
  end
end
