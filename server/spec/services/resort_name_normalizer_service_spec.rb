require 'rails_helper'

RSpec.describe ResortNameNormalizerService do
  describe '.normalize' do
    it 'converts to lowercase' do
      result = described_class.normalize("WHISTLER BLACKCOMB")
      expect(result).to eq("whistler blackcomb")
    end

    it 'removes common ski-related terms' do
      expect(described_class.normalize("Whistler Ski Resort")).to eq("whistler")
      expect(described_class.normalize("Big White Ski Area")).to eq("big white")
      expect(described_class.normalize("Mont Tremblant")).to eq("tremblant")
      expect(described_class.normalize("Aspen Mountain Resort")).to eq("aspen")
      expect(described_class.normalize("Vail Ski Resort")).to eq("vail")
    end

    it 'removes multiple ski terms from the same name' do
      result = described_class.normalize("Big White Ski Resort Mountain Area")
      expect(result).to eq("big white")
    end

    it 'replaces accented characters with ASCII equivalents' do
      expect(described_class.normalize("Chamonix-Mont-Blanc")).to eq("chamonix blanc")  # "mont" is a ski term
      expect(described_class.normalize("Val d'Isère")).to eq("d isere")  # "val" is a ski term
      expect(described_class.normalize("Cortina d'Ampezzo")).to eq("cortina d ampezzo")
      expect(described_class.normalize("Garmisch-Partenkirchen")).to eq("garmisch partenkirchen")
      expect(described_class.normalize("Åre")).to eq("are")
    end

    it 'handles special characters and ligatures' do
      expect(described_class.normalize("Gröden")).to eq("groden")
      expect(described_class.normalize("Sölden")).to eq("solden")
      expect(described_class.normalize("Cœur d'Alene")).to eq("coeur d alene")
      expect(described_class.normalize("Lærdal")).to eq("laerdal")
    end

    it 'removes punctuation and special characters' do
      expect(described_class.normalize("Whistler-Blackcomb")).to eq("whistler blackcomb")
      expect(described_class.normalize("Val d'Isère")).to eq("d isere")  # "val" is a ski term
      expect(described_class.normalize("St. Moritz")).to eq("st moritz")
      expect(described_class.normalize("Jackson Hole (WY)")).to eq("jackson hole wy")
      expect(described_class.normalize("Mammoth/June Lake")).to eq("mammoth june lake")  # Removed "Mountain" ski term
    end

    it 'normalizes whitespace' do
      expect(described_class.normalize("  Big   White  Ski   Resort  ")).to eq("big white")
      expect(described_class.normalize("Whistler   Blackcomb")).to eq("whistler blackcomb")
      expect(described_class.normalize("Park City")).to eq("park city")  # "Mountain" is a ski term
    end

    it 'handles empty and nil inputs' do
      expect(described_class.normalize("")).to eq("")
      expect(described_class.normalize(nil)).to eq("")
      expect(described_class.normalize("   ")).to eq("")
    end

    it 'handles names with only ski terms' do
      expect(described_class.normalize("Ski Resort")).to eq("")
      expect(described_class.normalize("Mountain Resort Area")).to eq("")
      expect(described_class.normalize("Alpine Ski Club")).to eq("")
    end

    it 'preserves words that are not ski terms' do
      expect(described_class.normalize("Blue Mountain")).to eq("blue")
      expect(described_class.normalize("Red River")).to eq("red river")
      expect(described_class.normalize("Crystal Mountain")).to eq("crystal")
    end

    it 'handles multilingual ski terms' do
      expect(described_class.normalize("Alpe di Siusi")).to eq("alpe di siusi")
      expect(described_class.normalize("Les Trois Vallées")).to eq("les trois vallees")
      expect(described_class.normalize("Sankt Anton am Arlberg")).to eq("sankt anton am arlberg")
    end

    it 'handles complex real-world resort names' do
      expect(described_class.normalize("Whistler Blackcomb Ski Resort")).to eq("whistler blackcomb")
      expect(described_class.normalize("Jackson Hole Mountain Resort")).to eq("jackson hole")
      expect(described_class.normalize("Mammoth Mountain Ski Area")).to eq("mammoth")
      expect(described_class.normalize("Park City Mountain Resort")).to eq("park city")
      expect(described_class.normalize("Steamboat Springs Ski Resort")).to eq("steamboat springs")
    end

    it 'handles edge cases with numbers and mixed content' do
      expect(described_class.normalize("Ski Resort 2000")).to eq("2000")
      expect(described_class.normalize("Big Sky 2024 Mountain")).to eq("big sky 2024")
      expect(described_class.normalize("X-Games Ski Resort")).to eq("x games")
    end
  end

  describe '.extract_potential_resort_names' do
    it 'splits line by common separators' do
      line = "Whistler, Vail | Aspen; Park City"
      results = described_class.extract_potential_resort_names(line)
      expect(results).to eq(["Whistler", "Vail", "Aspen", "Park City"])
    end

    it 'splits by tabs' do
      line = "Whistler\tVail\tAspen"
      results = described_class.extract_potential_resort_names(line)
      expect(results).to eq(["Whistler", "Vail", "Aspen"])
    end

    it 'trims whitespace from candidates' do
      line = "  Whistler  ,   Vail   |  Aspen  "
      results = described_class.extract_potential_resort_names(line)
      expect(results).to eq(["Whistler", "Vail", "Aspen"])
    end

    it 'filters out blank candidates' do
      line = "Whistler,,,Vail,   , Aspen"
      results = described_class.extract_potential_resort_names(line)
      expect(results).to eq(["Whistler", "Vail", "Aspen"])
    end

    it 'filters out candidates shorter than 3 characters' do
      line = "AB, Whistler, XY, Vail, Z"
      results = described_class.extract_potential_resort_names(line)
      expect(results).to eq(["Whistler", "Vail"])
    end

    it 'filters out candidates longer than 100 characters' do
      long_name = "A" * 101
      line = "Whistler, #{long_name}, Vail"
      results = described_class.extract_potential_resort_names(line)
      expect(results).to eq(["Whistler", "Vail"])
    end

    it 'filters out pure numbers' do
      line = "Whistler, 123, Vail, 456789"
      results = described_class.extract_potential_resort_names(line)
      expect(results).to eq(["Whistler", "Vail"])
    end

    it 'filters out short alphanumeric codes' do
      line = "Whistler, ABC, Vail, XY1, Park City"
      results = described_class.extract_potential_resort_names(line)
      expect(results).to eq(["Whistler", "Vail", "Park City"])
    end

    it 'allows longer alphanumeric names' do
      line = "Whistler, ABCD, Vail5, Park City"
      results = described_class.extract_potential_resort_names(line)
      expect(results).to eq(["Whistler", "ABCD", "Vail5", "Park City"])
    end

    it 'handles empty and nil inputs' do
      expect(described_class.extract_potential_resort_names("")).to eq([])
      expect(described_class.extract_potential_resort_names(nil)).to eq([])
      expect(described_class.extract_potential_resort_names("   ")).to eq([])
    end

    it 'handles single resort name' do
      line = "Whistler Blackcomb"
      results = described_class.extract_potential_resort_names(line)
      expect(results).to eq(["Whistler Blackcomb"])
    end

    it 'handles mixed separators' do
      line = "Whistler, Vail; Aspen | Park City\tBig Sky"
      results = described_class.extract_potential_resort_names(line)
      expect(results).to eq(["Whistler", "Vail", "Aspen", "Park City", "Big Sky"])
    end

    it 'handles real-world import text examples' do
      # CSV-like format
      line = "2024-01-15, Whistler, Canada, Powder day"
      results = described_class.extract_potential_resort_names(line)
      expect(results).to include("Whistler", "Canada", "Powder day")
      # Date should be included as it's longer than 3 chars and contains non-digits
      expect(results).to include("2024-01-15")

      # Text with multiple resorts
      line = "Visited Vail and Aspen this week"
      results = described_class.extract_potential_resort_names(line)
      expect(results).to eq(["Visited Vail and Aspen this week"])
    end

    it 'preserves resort names with spaces and special characters' do
      line = "Park City, Val d'Isère, St. Moritz"
      results = described_class.extract_potential_resort_names(line)
      expect(results).to eq(["Park City", "Val d'Isère", "St. Moritz"])
    end
  end

  describe 'constants' do
    it 'defines SKI_TERMS constant' do
      expect(described_class::SKI_TERMS).to be_an(Array)
      expect(described_class::SKI_TERMS).to include('ski', 'resort', 'mountain')
    end

    it 'defines ACCENT_MAP constant' do
      expect(described_class::ACCENT_MAP).to be_a(Hash)
      expect(described_class::ACCENT_MAP).to include('á' => 'a', 'é' => 'e')
    end

    it 'has frozen constants' do
      expect(described_class::SKI_TERMS).to be_frozen
      expect(described_class::ACCENT_MAP).to be_frozen
    end
  end
end