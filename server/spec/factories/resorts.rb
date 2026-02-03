# spec/factories/resorts.rb
FactoryBot.define do
  factory :resort do
    # Use sequence to ensure uniqueness for required fields
    sequence(:name) { |n| "Test Resort #{n}" }
    country { "Testland" }
    verified { true }

    # Add other attributes if needed, e.g.:
    # latitude { 45.0 }
    # longitude { -110.0 }
    # region { "Test Region" }
  end
end
