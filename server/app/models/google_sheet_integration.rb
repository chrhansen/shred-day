class GoogleSheetIntegration < ApplicationRecord
  belongs_to :user

  enum :status, { connected: 0, errored: 1, disconnected: 2 }

  validates :user_id, presence: true, uniqueness: true

  def connected?
    status == "connected"
  end

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
end
