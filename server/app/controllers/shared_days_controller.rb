# Controller for shared day OG previews and HTML shell.
class SharedDaysController < ActionController::Base
  include Rails.application.routes.url_helpers

  def show
    result = Days::FindSharedDayService.new(params[:id]).find_shared_day
    @day = result.day

    index_html_path = Rails.public_path.join('index.html')
    return head :not_found unless File.exist?(index_html_path)

    html = inject_og_tags(File.read(index_html_path))

    render html: html.html_safe, layout: false
  end

  private

  def inject_og_tags(html)
    document = Nokogiri::HTML.parse(html)
    head = document.at('head')
    return html unless head

    head.search('title').remove
    head.search('meta[name="description"]').remove
    head.search('meta[property^="og:"]').remove
    head.search('meta[name^="twitter:"]').remove

    head.prepend_child(Nokogiri::HTML::DocumentFragment.parse(og_tags))
    document.to_html
  end

  def og_tags
    tags = []
    title = og_title
    description = og_description
    image_urls = og_image_urls
    url = og_url

    tags << helpers.content_tag(:title, title)
    tags << helpers.tag(:meta, name: 'description', content: description)
    tags << helpers.tag(:meta, property: 'og:title', content: title)
    tags << helpers.tag(:meta, property: 'og:description', content: description)
    tags << helpers.tag(:meta, property: 'og:type', content: 'website')
    tags << helpers.tag(:meta, property: 'og:url', content: url)
    tags << helpers.tag(:meta, property: 'og:site_name', content: 'Shred Day')

    if image_urls.any?
      image_urls.each do |image_url|
        tags << helpers.tag(:meta, property: 'og:image', content: image_url)
      end
      tags << helpers.tag(:meta, name: 'twitter:card', content: 'summary_large_image')
      tags << helpers.tag(:meta, name: 'twitter:image', content: image_urls.first)
    else
      tags << helpers.tag(:meta, name: 'twitter:card', content: 'summary')
    end
    tags << helpers.tag(:meta, name: 'twitter:title', content: title)
    tags << helpers.tag(:meta, name: 'twitter:description', content: description)

    tags.join("\n")
  end

  def og_title
    return 'This day has melted away' unless @day

    resort_name = @day.resort&.name || 'Ski day'
    "#{resort_name} \u00b7 #{formatted_date}"
  end

  def og_description
    return "The ski day you're looking for doesn't exist or is no longer shared." unless @day

    username = @day.user&.username || 'A Shred Day user'
    resort_name = @day.resort&.name || 'a resort'
    "#{username} shared a ski day at #{resort_name} on #{formatted_date}."
  end

  def og_image_urls
    return [] unless @day

    photos = @day.photos.select { |photo| photo.image.attached? }.first(4)
    return [default_image_url].compact if photos.empty?

    photos.map { |photo| url_for(photo.image.variant(:full)) }
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
end
