class AccountUpdateService
  def initialize(user, params)
    @user = user
    @params = params
  end

  def update
    @user.with_lock { update_locked }
  end

  private

  def update_locked
    @user.assign_attributes(@params)
    if @user.email_changed?
      if @user.email.to_s.strip.downcase != @user.email_in_database.to_s.strip.downcase
        @user.errors.add(:email, "cannot be changed until a new-email confirmation flow is available")
        return Result.new(@user, false, @user.errors.full_messages)
      end
      @user.email = @user.email_in_database
    end
    affected_dates = @user.season_start_day_changed? ? @user.days.pluck(:date) : []
    password_changed = @user.password_digest_changed?
    if password_changed
      @user.password_confirmed_at = nil
      @user.password_session_version += 1
      @user.email_confirmation_token_digest = nil
      @user.email_confirmation_expires_at = nil
      @user.email_confirmation_sent_at = nil
    end

    if @user.save
      DayNumberUpdaterService.new(user: @user, affected_dates: affected_dates).update!
      if password_changed
        @user.mobile_sessions.where(authentication_method: "password", revoked_at: nil).update_all(revoked_at: Time.current)
        Users::EmailConfirmationService.new.send_confirmation(@user)
      end

      Result.new(@user, true, nil)
    else
      Result.new(@user, false, @user.errors.full_messages)
    end
  end

  class Result
    attr_reader :user, :errors

    def initialize(user, updated, errors)
      @user = user
      @updated = updated
      @errors = errors
    end

    def updated?
      @updated
    end
  end
end
