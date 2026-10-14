class Users::CreateUserService
  def initialize(params, password_signup: true)
    @params = params
    @password_signup = password_signup
  end

  def create_user
    password = @params[:password].presence || SecureRandom.hex(32)
    user = User.new(email: normalized_email, password: password)

    if user.save
      EnsureDefaultTagsService.new(user).create_default_tags
      UserMailer.signup_notification(user).deliver_later
      Users::EmailConfirmationService.new.send_confirmation(user) if @password_signup
      Result.new(user, true, nil)
    else
      Result.new(user, false, user.errors.full_messages)
    end
  end

  private

  def normalized_email
    @params[:email].to_s.strip.downcase
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
