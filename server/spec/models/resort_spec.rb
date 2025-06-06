require 'rails_helper'

RSpec.describe Resort, type: :model do
  # Test suite for Resort model validations
  describe 'validations' do
    # Create a valid resort instance before each test in this block
    subject { build(:resort) }

    it 'is valid with valid attributes' do
      expect(subject).to be_valid
    end

    it 'is not valid without a name' do
      subject.name = nil
      expect(subject).to_not be_valid
      expect(subject.errors[:name]).to include("can't be blank")
    end

    it 'is not valid without a country' do
      subject.country = nil
      expect(subject).to_not be_valid
      expect(subject.errors[:country]).to include("can't be blank")
    end

    context 'uniqueness of name scoped to country' do
      # Create a persisted resort before these tests
      before { create(:resort, name: "Big Sky", country: "USA") }

      it 'is not valid with a duplicate name in the same country' do
        duplicate_resort = build(:resort, name: "Big Sky", country: "USA")
        expect(duplicate_resort).to_not be_valid
        expect(duplicate_resort.errors[:name]).to include("has already been taken")
      end

      it 'is valid with the same name but different country' do
        different_country_resort = build(:resort, name: "Big Sky", country: "Canada")
        expect(different_country_resort).to be_valid
      end
    end
  end

  describe 'callbacks' do
    it 'sets normalized_name before saving' do
      resort = build(:resort, name: "Whistler Blackcomb Ski Resort")
      resort.save!
      expect(resort.normalized_name).to eq("whistler blackcomb")
    end

    it 'updates normalized_name when name changes' do
      resort = create(:resort, name: "Test Resort")
      resort.update!(name: "New Test Mountain")
      expect(resort.normalized_name).to eq("new test")
    end
  end

  describe '.fuzzy_search' do
    before do
      create(:resort, name: "Whistler Blackcomb", country: "Canada")
      create(:resort, name: "Whistler Village", country: "Canada") 
      create(:resort, name: "Big White", country: "Canada")
      create(:resort, name: "White Mountain", country: "USA")
      create(:resort, name: "Vail", country: "USA")
    end

    it 'finds resorts with fuzzy matching' do
      results = Resort.fuzzy_search("whistler")
      expect(results.count).to eq(2)
      expect(results.map(&:name)).to include("Whistler Blackcomb", "Whistler Village")
    end

    it 'returns results ordered by similarity' do
      results = Resort.fuzzy_search("whistler blackcomb")
      expect(results.first.name).to eq("Whistler Blackcomb")
    end

    it 'respects the threshold parameter' do
      results = Resort.fuzzy_search("xyz", threshold: 0.8)
      expect(results).to be_empty
    end

    it 'respects the limit parameter' do
      results = Resort.fuzzy_search("white", limit: 1)
      expect(results.count).to eq(1)
    end

    it 'returns empty relation for blank query' do
      expect(Resort.fuzzy_search("")).to be_empty
      expect(Resort.fuzzy_search(nil)).to be_empty
    end
  end

  describe '.best_match' do
    before do
      create(:resort, name: "Whistler Blackcomb", country: "Canada")
      create(:resort, name: "Whistler Village", country: "Canada")
      create(:resort, name: "Big White", country: "Canada")
    end

    it 'returns the best matching resort' do
      result = Resort.best_match("whistler blackcomb")
      expect(result.name).to eq("Whistler Blackcomb")
    end

    it 'returns nil when no match above threshold' do
      result = Resort.best_match("nonexistent resort", threshold: 0.8)
      expect(result).to be_nil
    end

    it 'respects the threshold parameter' do
      result = Resort.best_match("whistler", threshold: 0.1)
      expect(result).to be_present
      
      result = Resort.best_match("whistler", threshold: 0.9)
      expect(result).to be_nil
    end
  end

  describe '.search_by_terms' do
    before do
      create(:resort, name: "Whistler Blackcomb", country: "Canada")
      create(:resort, name: "Big White Ski Resort", country: "Canada")
      create(:resort, name: "Vail Mountain", country: "USA")
      create(:resort, name: "Aspen Snowmass", country: "USA")
    end

    it 'finds resorts matching any of the terms' do
      results = Resort.search_by_terms(["whistler", "vail"])
      result_names = results.map(&:name)
      expect(result_names).to include("Whistler Blackcomb")
      # Vail should match but check if it actually does due to normalization
      vail_results = Resort.search_by_terms(["vail"])
      expect(vail_results.map(&:name)).to include("Vail Mountain")
    end

    it 'removes duplicate results' do
      results = Resort.search_by_terms(["big", "white"])
      resort_names = results.map(&:name)
      expect(resort_names.count("Big White Ski Resort")).to eq(1)
    end

    it 'ignores short terms (less than 3 characters)' do
      results = Resort.search_by_terms(["ab", "whistler"])
      expect(results.map(&:name)).to include("Whistler Blackcomb")
    end

    it 'ignores blank terms' do
      results = Resort.search_by_terms(["", "  ", "whistler"])
      expect(results.map(&:name)).to include("Whistler Blackcomb")
    end

    it 'returns empty relation for blank terms array' do
      expect(Resort.search_by_terms([])).to be_empty
      expect(Resort.search_by_terms(nil)).to be_empty
    end

    it 'returns empty relation when no terms meet minimum length' do
      results = Resort.search_by_terms(["a", "ab"])
      expect(results).to be_empty
    end

    it 'handles single term search' do
      results = Resort.search_by_terms(["whistler"])
      expect(results.map(&:name)).to include("Whistler Blackcomb")
    end

    it 'respects the threshold parameter' do
      results = Resort.search_by_terms(["xyz"], threshold: 0.9)
      expect(results).to be_empty
    end
  end

  describe 'associations' do
    it 'has many days' do
      resort = create(:resort)
      day1 = create(:day, resort: resort)
      day2 = create(:day, resort: resort)
      
      expect(resort.days).to include(day1, day2)
    end
  end
end
