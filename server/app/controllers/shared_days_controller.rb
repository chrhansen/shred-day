# Controller for shared day OG previews and HTML shell.
class SharedDaysController < ActionController::Base
  include Rails.application.routes.url_helpers

  def show
    result = Days::FindSharedDayService.new(params[:id]).find_shared_day
    @day = result.day

    index_html_path = Rails.public_path.join('index.html')
    html = if File.exist?(index_html_path)
      inject_og_tags(File.read(index_html_path))
    else
      fallback_html
    end

    render html: html.html_safe, layout: false
  end

  private

  def inject_og_tags(html)
    html.sub('</head>', "#{og_tags}\n</head>")
  end

  def og_tags
    tags = []
    title = og_title
    description = og_description
    image_url = og_image_url
    url = og_url

    tags << helpers.tag(:meta, name: 'description', content: description)
    tags << helpers.tag(:meta, property: 'og:title', content: title)
    tags << helpers.tag(:meta, property: 'og:description', content: description)
    tags << helpers.tag(:meta, property: 'og:type', content: 'website')
    tags << helpers.tag(:meta, property: 'og:url', content: url)

    if image_url.present?
      tags << helpers.tag(:meta, property: 'og:image', content: image_url)
      tags << helpers.tag(:meta, name: 'twitter:card', content: 'summary_large_image')
    else
      tags << helpers.tag(:meta, name: 'twitter:card', content: 'summary')
    end

    tags.join("\n")
  end

  def og_title
    return 'This day has melted away' unless @day

    "#{@day.resort&.name || 'Ski day'} \u00b7 #{formatted_date}"
  end

  def og_description
    return "The ski day you're looking for doesn't exist or is no longer shared." unless @day

    base = "#{@day.user&.username || 'A Shred Day user'} shared a ski day at #{@day.resort&.name || 'a resort'}."
    notes = @day.notes.to_s.strip
    return base if notes.blank?

    truncated_notes = notes.length > 140 ? "#{notes[0, 137]}..." : notes
    "#{base} #{truncated_notes}"
  end

  def og_image_url
    return default_image_url unless @day

    photo = @day.photos.first
    return default_image_url unless photo&.image&.attached?

    url_for(photo.image.variant(:full))
  end

  def default_image_url
    return nil unless request

    "#{request.base_url}/shread-day-logo_192x192.png"
  end

  def og_url
    "#{request.base_url}/d/#{short_day_id}"
  end

  def formatted_date
    @day.date.strftime('%b %-d, %Y')
  end

  def short_day_id
    return '' unless params[:id]

    params[:id].to_s.delete_prefix('day_')
  end

  def fallback_html
    <<~HTML
      <!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          #{og_tags}
          <title>Shred Day</title>
        </head>
        <body>
          <div id="root"></div>
        </body>
      </html>
    HTML
  end
end
