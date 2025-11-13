class CreateTagsAndTagDays < ActiveRecord::Migration[8.0]
  DEFAULT_TAGS = ["With Friends", "Training", "Bluebird"].freeze

  class MigrationUser < ApplicationRecord
    self.table_name = "users"
  end

  class MigrationDay < ApplicationRecord
    self.table_name = "days"
  end

  class MigrationTag < ApplicationRecord
    self.table_name = "tags"
  end

  class MigrationTagDay < ApplicationRecord
    self.table_name = "tag_days"
  end

  def up
    create_table :tags, id: :string, default: -> { "gen_id('tag')" } do |t|
      t.references :user, null: false, type: :string, foreign_key: true
      t.string :name, null: false

      t.timestamps
    end

    add_index :tags, [:user_id, Arel.sql("LOWER(name)")], unique: true, name: "index_tags_on_user_id_and_lower_name"

    create_table :tag_days, id: :string, default: -> { "gen_id('tgdy')" } do |t|
      t.references :day, null: false, type: :string, foreign_key: { on_delete: :cascade }
      t.references :tag, null: false, type: :string, foreign_key: true

      t.timestamps
    end

    add_index :tag_days, [:day_id, :tag_id], unique: true

    MigrationTag.reset_column_information
    MigrationTagDay.reset_column_information
    MigrationDay.reset_column_information

    say_with_time "Migrating existing activities to tags" do
      MigrationDay.where.not(activity: [nil, ""]).find_each do |day|
        tag = MigrationTag.find_or_create_by!(user_id: day.user_id, name: day.activity)
        MigrationTagDay.find_or_create_by!(day_id: day.id, tag_id: tag.id)
      end
    end

    say_with_time "Seeding default tags for all users" do
      MigrationUser.find_each do |user|
        DEFAULT_TAGS.each do |tag_name|
          MigrationTag.find_or_create_by!(user_id: user.id, name: tag_name)
        end
      end
    end

    remove_column :days, :activity, :string
  end

  def down
    add_column :days, :activity, :string

    MigrationTag.reset_column_information
    MigrationTagDay.reset_column_information
    MigrationDay.reset_column_information

    say_with_time "Restoring activity from first associated tag" do
      MigrationDay.find_each do |day|
        tag_name = MigrationTag.joins("INNER JOIN tag_days ON tag_days.tag_id = tags.id")
                               .where("tag_days.day_id = ?", day.id)
                               .order("tag_days.created_at ASC")
                               .limit(1)
                               .pluck(:name).first
        day.update!(activity: tag_name) if tag_name
      end
    end

    drop_table :tag_days
    drop_table :tags
  end
end
