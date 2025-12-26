class Users::CreateUserService
  def initialize(params)
    @params = params
  end

  def create_user
    user = User.new(email: normalized_email, password: @params[:password])

    if user.save
      EnsureDefaultTagsService.new(user).create_default_tags
      UserMailer.signup_notification(user).deliver_later
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
