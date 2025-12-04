class GoogleSheetIntegration < ApplicationRecord
  belongs_to :user

  enum :status, { connected: 0, errored: 1, disconnected: 2 }, prefix: true

  validates :user_id, presence: true, uniqueness: true

  def mark_error!(message)
    update(status: :errored, last_error: message)
  end

  def disconnect!
    update(
      status: :disconnected,
      access_token: nil,
      refresh_token: nil,
      access_token_expires_at: nil,
      spreadsheet_id: nil,
      spreadsheet_url: nil
    )
  end

  def as_json(options = {})
    defaults = {
      except: [
        :access_token,
        :refresh_token,
        :access_token_expires_at,
        :user_id,
        :created_at,
        :updated_at,
        :spreadsheet_id,
        :spreadsheet_url
      ]
    }

    super(defaults.deep_merge(options || {})).merge(
      "connected" => status_connected?,
      "sheet_url" => spreadsheet_url
    )
  end
end
