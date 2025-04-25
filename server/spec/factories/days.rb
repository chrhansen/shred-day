# spec/factories/days.rb
FactoryBot.define do
  factory :day do
    date { Date.today } # Default to today's date
    user # Associate with user factory
    ski # Associate with ski factory
    resort # Associate with resort factory
  end
end
