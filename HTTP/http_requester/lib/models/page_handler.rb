class PageHandler
  UniqPageNeedingPing = Struct.new(:path, :pages, :response, :monitor_id, :ssl_expires_at) do
    def initialize(path, pages, response = nil, monitor_id: nil, ssl_expires_at: nil)
      super(path, pages, response)
      self.monitor_id = monitor_id
      self.ssl_expires_at = ssl_expires_at
    end
  end

  attr_accessor :pages, :uniq_pages_needing_ping
  attr_reader :logger

  def initialize(logger)
    @pages = []
    @uniq_pages_needing_ping = nil
    @logger = logger
  end

  def add_page_from_change(change)
    page = Page.new(
      change.page_id,
      change.path,
      change.interval_time,
      change.user_id,
      false,
      monitor_id: change.monitor_id,
      base_url: change.base_url,
      keyword: change.keyword,
      keyword_must_contain: change.keyword_must_contain
    )
    pages << page
  end

  def update_page_from_change(change)
    page = pages.find { |p| p.id == change.page_id }
    if page
      page.path = change.path
      page.interval_time = change.interval_time
      page.keyword = change.keyword
      page.keyword_must_contain = change.keyword_must_contain
      page.monitor_id = change.monitor_id
      page.base_url = change.base_url
      logger.info("Updated page id=#{change.page_id}")
    else
      logger.warn("Page with id: #{change.page_id} not found for update")
    end
  end

  def remove_page_from_change(change)
    pages.reject! { |page| page.id == change.page_id }
  end

  def uniq_pages_needing_ping
    logger.info("Calculating unique pages needing ping...")
    @uniq_pages_needing_ping ||= begin
      unique_pages = pages.find_all(&:ready_for_ping?).group_by(&:normalize_path).map do |path, grouped_pages|
        UniqPageNeedingPing.new(path, grouped_pages, nil, monitor_id: grouped_pages.first&.monitor_id)
      end
      unique_pages.empty? ? nil : unique_pages
    end
  rescue => e
    logger.error("Error while determining pages needing ping: #{e.message} \n #{e.backtrace.join("\n")}")
    []
  end

  def pages_needing_ping?
    !uniq_pages_needing_ping.nil?
  end
end
