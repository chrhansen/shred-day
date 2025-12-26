class Users::CreateUserService
  def initialize(params)
    @params = params
  end

  def create_user
    user = User.new(email: normalized_email, password: @params[:password])

    if user.save
      EnsureDefaultTagsService.new(user).create_default_tags
      notify_signup(user)
      Result.new(user, true, nil)
    else
      Result.new(user, false, user.errors.full_messages)
    end
  end

  private

  def normalized_email
    @params[:email].to_s.strip.downcase
  end

  def notify_signup(user)
    result = Notifications::UserSignedUpEmailService.new(user).send_notification
    return if result.sent?

    Rails.logger.warn("Signup email not sent for user #{user.id}: #{result.error}")
  end

  class Result
    attr_reader :user, :errors

    def initialize(user, created, errors)
      @user = user
      @created = created
      @errors = errors
    end

    def created?
      @created
    end
  end
end
