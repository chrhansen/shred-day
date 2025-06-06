class Resort < ApplicationRecord
  has_many :days

  # Validations
  validates :name, presence: true, uniqueness: { scope: :country }
  validates :country, presence: true

  # Callbacks
  before_save :set_normalized_name

  # Find resorts using fuzzy matching with trigram similarity
  def self.fuzzy_search(query, threshold: 0.3, limit: 5)
    normalized_query = ResortNameNormalizerService.normalize(query)
    return none if normalized_query.blank?

    # Use Arel to safely construct the similarity queries
    similarity_condition = Arel.sql("similarity(normalized_name, #{connection.quote(normalized_query)}) > #{connection.quote(threshold)}")
    similarity_order = Arel.sql("similarity(normalized_name, #{connection.quote(normalized_query)}) DESC")

    where(similarity_condition)
      .order(similarity_order)
      .limit(limit)
  end

  # Find the best matching resort for a given query
  def self.best_match(query, threshold: 0.3)
    fuzzy_search(query, threshold: threshold, limit: 1).first
  end

  # Find resorts that contain any of the given terms
  def self.search_by_terms(terms, threshold: 0.25)
    return none if terms.blank?

    results = []
    terms.each do |term|
      normalized_term = ResortNameNormalizerService.normalize(term)
      next if normalized_term.blank? || normalized_term.length < 3

      matches = fuzzy_search(normalized_term, threshold: threshold, limit: 3)
      results.concat(matches.to_a)
    end

    # Remove duplicates and return the best matches
    unique_results = results.uniq
    return none if unique_results.empty?

    # Re-sort by best similarity score
    if unique_results.size > 1
      best_term = terms.map { |t| ResortNameNormalizerService.normalize(t) }.reject(&:blank?).first
      return Resort.where(id: unique_results.map(&:id)).fuzzy_search(best_term, threshold: 0.1)
    end

    Resort.where(id: unique_results.map(&:id))
  end

  private

  def set_normalized_name
    self.normalized_name = ResortNameNormalizerService.normalize(name)
  end
end
