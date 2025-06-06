class AddNormalizedNameToResorts < ActiveRecord::Migration[8.0]
  def change
    # Enable the pg_trgm extension for trigram similarity
    enable_extension "pg_trgm"
    
    # Add normalized_name column
    add_column :resorts, :normalized_name, :text
    
    # Add GiST index for efficient similarity searches
    add_index :resorts, :normalized_name, using: :gist, opclass: :gist_trgm_ops
    
    # Populate normalized_name for existing resorts
    reversible do |dir|
      dir.up do
        Resort.reset_column_information
        Resort.find_each do |resort|
          normalized = ResortNameNormalizerService.normalize(resort.name)
          resort.update_column(:normalized_name, normalized)
        end
      end
    end
  end
end
