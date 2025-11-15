namespace :tags do
  desc "Copy legacy activity values into user tags and tag_days"
  task migrate_activities: :environment do
    migrated_days = 0
    migrated_tags = 0

    User.find_each do |user|
      activities = user.days.where.not(activity: [nil, ""]).distinct.pluck(:activity)
      activity_tag_map = {}

      activities.each do |activity_name|
        tag = user.tags.find_or_create_by!(name: activity_name)
        activity_tag_map[activity_name] = tag
        migrated_tags += 1 if tag.previous_changes.key?("id")
      end

      user.days.where.not(activity: [nil, ""]).find_each do |day|
        tag = activity_tag_map[day.activity]
        next unless tag

        TagDay.find_or_create_by!(day: day, tag: tag)
        migrated_days += 1
      end
    end

    puts "Migrated #{migrated_days} day tag associations and ensured #{migrated_tags} tags."
  end
end
