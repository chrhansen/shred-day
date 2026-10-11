class Users::DeleteAccountService
  def initialize(user)
    @user = user
  end

  def delete_account
    @user.auth_identities.where(provider: "apple").each do |identity|
      Mobile::AppleTokenService.new.revoke_token(identity.refresh_token) if identity.refresh_token.present?
    end
    attachments = ActiveStorage::Attachment.where(record: [ @user, *@user.photos.to_a ]).includes(:blob).map(&:blob)
    User.transaction do
      Resort.where(suggested_by: @user.id).update_all(suggested_by: nil)
      @user.destroy!
    end
    attachments.uniq.each(&:purge_later)
    Result.new(true)
  rescue ActiveRecord::RecordNotDestroyed, ActiveRecord::InvalidForeignKey, Mobile::AppleTokenService::ExchangeError => e
    Result.new(false, e.is_a?(Mobile::AppleTokenService::ExchangeError) ? e.message : "Account deletion could not be completed. Please try again.")
  end

  class Result
    attr_reader :error

    def initialize(deleted, error = nil)
      @deleted, @error = deleted, error
    end

    def deleted?
      @deleted
    end
  end
end
