class UserMailer < ApplicationMailer
  def signup_notification(user)
    @user = user

    mail(to: notification_email, subject: "New user signup - Shred Day") do |format|
      format.html { render html: signup_html.html_safe }
    end
  end

  def day_created_notification(day)
    @day = day

    mail(to: notification_email, subject: "New day logged - Shred Day") do |format|
      format.html { render html: day_html.html_safe }
    end
  end

  def resort_suggestion_notification(user, resort)
    @user = user
    @resort = resort

    mail(to: notification_email, subject: "Resort suggestion - Shred Day") do |format|
      format.html { render html: resort_suggestion_html.html_safe }
    end
  end

  private

  def signup_html
    email = ERB::Util.html_escape(@user.email)
    user_id = ERB::Util.html_escape(@user.id)

    <<~HTML
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #0f172a; border-bottom: 2px solid #0ea5e9; padding-bottom: 10px;">
          New Shred Day Signup
        </h2>
        <p style="color: #334155; font-size: 16px; line-height: 1.5;">
          A new user just signed up.
        </p>
        <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0 0 8px 0;"><strong>Email:</strong> #{email}</p>
          <p style="margin: 0;"><strong>User ID:</strong> #{user_id}</p>
        </div>
      </div>
    HTML
  end

  def day_html
    user_email = ERB::Util.html_escape(@day.user.email)
    day_id = ERB::Util.html_escape(@day.id)
    date = ERB::Util.html_escape(@day.date)
    resort_name = ERB::Util.html_escape(@day.resort&.name || "Unknown resort")

    <<~HTML
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #0f172a; border-bottom: 2px solid #22c55e; padding-bottom: 10px;">
          New Day Logged
        </h2>
        <p style="color: #334155; font-size: 16px; line-height: 1.5;">
          A new day was created in Shred Day.
        </p>
        <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0 0 8px 0;"><strong>User:</strong> #{user_email}</p>
          <p style="margin: 0 0 8px 0;"><strong>Date:</strong> #{date}</p>
          <p style="margin: 0 0 8px 0;"><strong>Resort:</strong> #{resort_name}</p>
          <p style="margin: 0;"><strong>Day ID:</strong> #{day_id}</p>
        </div>
      </div>
    HTML
  end

  def resort_suggestion_html
    user_name = ERB::Util.html_escape(@user.full_name.presence || @user.email)
    user_email = ERB::Util.html_escape(@user.email)
    user_id = ERB::Util.html_escape(@user.id)
    resort_name = ERB::Util.html_escape(@resort.name)
    resort_country = ERB::Util.html_escape(@resort.country)
    resort_id = ERB::Util.html_escape(@resort.id)

    <<~HTML
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #0f172a; border-bottom: 2px solid #f97316; padding-bottom: 10px;">
          New Resort Suggestion
        </h2>
        <p style="color: #334155; font-size: 16px; line-height: 1.5;">
          A user suggested a new resort.
        </p>
        <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0 0 8px 0;"><strong>User:</strong> #{user_name}</p>
          <p style="margin: 0 0 8px 0;"><strong>Email:</strong> #{user_email}</p>
          <p style="margin: 0 0 8px 0;"><strong>User ID:</strong> #{user_id}</p>
          <p style="margin: 0 0 8px 0;"><strong>Resort:</strong> #{resort_name}</p>
          <p style="margin: 0 0 8px 0;"><strong>Country:</strong> #{resort_country}</p>
          <p style="margin: 0;"><strong>Resort ID:</strong> #{resort_id}</p>
        </div>
      </div>
    HTML
  end
end
