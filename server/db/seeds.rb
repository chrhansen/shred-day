# This file should ensure the existence of records required to run the application in every environment (production,
# development, test). The code here should be idempotent so that it can be executed at any point in every environment.
# The data can then be loaded with the bin/rails db:seed command (or created alongside the database with db:setup).
#
# Example:
#
#   ["Action", "Comedy", "Drama", "Horror"].each do |genre_name|
#     MovieGenre.find_or_create_by!(name: genre_name)
#   end

require 'csv'
require 'json'

# Define the path to the CSV file relative to the Rails root
csv_file_path = Rails.root.join('db', 'seed-files', 'ski-resorts-openicpsr-org.csv')

# Check if the file exists
unless File.exist?(csv_file_path)
  puts "Seed file not found: #{csv_file_path}"
  return # or raise an error
end

puts "Seeding resorts from #{csv_file_path}..."

resorts_created = 0
resorts_skipped = 0

begin
  # Use find_or_create_by to avoid duplicates if seeding multiple times
  CSV.foreach(csv_file_path, headers: true) do |row|
    begin
      name = row['name']
      coordinate_str = row['location_coordinate']
      country = row['location_country']
      region = row['location_region']

      # Skip row if essential data is missing
      if name.blank? || coordinate_str.blank? # Check original string
        puts "Skipping row due to missing name or coordinate: #{row.to_h}"
        resorts_skipped += 1
        next
      end

      # Extract latitude and longitude
      latitude = nil
      longitude = nil
      begin
        # 1. Remove potential outer curly braces and whitespace
        cleaned_str = coordinate_str.strip.delete_prefix("{").delete_suffix("}").strip
        # 2. Replace single quotes with double quotes for valid JSON
        json_str = cleaned_str.gsub("'", '"')
        # 3. Parse the JSON string
        coordinate_hash = JSON.parse("{#{json_str}}") # Add braces back for valid JSON structure

        # 4. Extract values (assuming keys are strings like "lat", "long")
        latitude = coordinate_hash['lat']&.to_f
        longitude = coordinate_hash['long']&.to_f # Use safe navigation (&.) in case keys are missing

        unless latitude && longitude
           raise "Latitude or Longitude not found in parsed hash: #{coordinate_hash}"
        end

      rescue JSON::ParserError => e
        puts "Skipping row due to JSON parsing error: '#{e.message}' for coordinate string: '#{coordinate_str}' in row #{row.to_h}"
        resorts_skipped += 1
        next
      rescue => e # Catch other errors during extraction
        puts "Skipping row due to coordinate processing error: '#{e.message}' for coordinate string: '#{coordinate_str}' in row #{row.to_h}"
        resorts_skipped += 1
        next
      end

      # Find existing or initialize new resort (case-insensitive name check)
      resort = Resort.find_or_initialize_by(name: name)

      # Update attributes only if it's a new record or if they differ (optional, reduces writes)
      # Using assign_attributes for cleaner update
      if resort.new_record? || resort.latitude != latitude || resort.longitude != longitude || resort.country != country || resort.region != region
        resort.assign_attributes(
          latitude: latitude,
          longitude: longitude,
          country: country,
          region: region
        )
        if resort.save
          resorts_created += 1
        else
          puts "Failed to save resort: #{resort.errors.full_messages.join(', ')} for data: #{row.to_h}"
          resorts_skipped += 1
        end
      else
        # Resort already exists with the same data
        resorts_skipped += 1
      end

    rescue => e
      puts "Error processing row: #{row.to_h}. Error: #{e.message}"
      resorts_skipped += 1
    end
  end

  puts "----------------------------------------"
  puts "Seeding complete."
  puts "Resorts created/updated: #{resorts_created}"
  puts "Resorts skipped (duplicates or errors): #{resorts_skipped}"

rescue Errno::ENOENT
  puts "Error: Seed file not found at #{csv_file_path}"
rescue CSV::MalformedCSVError => e
  puts "Error: Malformed CSV file at #{csv_file_path}. Error: #{e.message}"
rescue => e
  puts "An unexpected error occurred during seeding: #{e.message}"
  puts e.backtrace.join("\n")
end
