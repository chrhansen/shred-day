# This service normalizes resort names for fuzzy matching and search.
# It removes ski-related terms, converts accented characters to ASCII,
# removes punctuation, and normalizes whitespace.
class ResortNameNormalizerService
  # Common ski-related terms to remove (in multiple languages)
  SKI_TERMS = %w[
    ski skiing skii skier skiers
    mountain mont mont. berg fjell fjellet
    resort resorts area areas
    glacier gletscher gletsjer
    slopes pistes piste
    dome peak summit
    valley val valle
    alpen alps alpine alpina
    snow neige schnee
    winter hiver inverno
    station estacion
    club
  ].freeze
  
  # Mapping of accented characters to ASCII equivalents
  ACCENT_MAP = {
    'á' => 'a', 'à' => 'a', 'ä' => 'a', 'â' => 'a', 'ã' => 'a', 'å' => 'a',
    'é' => 'e', 'è' => 'e', 'ë' => 'e', 'ê' => 'e',
    'í' => 'i', 'ì' => 'i', 'ï' => 'i', 'î' => 'i',
    'ó' => 'o', 'ò' => 'o', 'ö' => 'o', 'ô' => 'o', 'õ' => 'o', 'ø' => 'o',
    'ú' => 'u', 'ù' => 'u', 'ü' => 'u', 'û' => 'u',
    'ý' => 'y', 'ÿ' => 'y',
    'ñ' => 'n',
    'ç' => 'c',
    'ß' => 'ss',
    'æ' => 'ae',
    'œ' => 'oe'
  }.freeze
  
  def self.normalize(name)
    return '' if name.blank?
    
    # Convert to lowercase
    normalized = name.to_s.downcase
    
    # Remove common ski-related terms
    SKI_TERMS.each do |term|
      normalized = normalized.gsub(/\b#{Regexp.escape(term)}\b/, '')
    end
    
    # Replace accented characters with ASCII equivalents
    ACCENT_MAP.each do |accented, ascii|
      normalized = normalized.gsub(accented, ascii)
    end
    
    # Remove punctuation and special characters, replace with spaces
    normalized = normalized.gsub(/[^\w\s]/, ' ')
    
    # Normalize whitespace (remove extra spaces, leading/trailing whitespace)
    normalized = normalized.squeeze(' ').strip
    
    normalized
  end
  
  # Split a line into potential resort name candidates
  def self.extract_potential_resort_names(line)
    return [] if line.blank?
    
    # Split by common separators
    separators = /[,;|\t]+/
    candidates = line.split(separators)
    
    # Clean and filter candidates
    candidates.map(&:strip).reject do |candidate|
      candidate.blank? ||
      candidate.length < 3 ||
      candidate.length > 100 ||
      candidate.match?(/^\d+$/) || # Just numbers
      candidate.match?(/^[a-z0-9]+$/i) && candidate.length < 4 # Short alphanumeric codes
    end
  end
end