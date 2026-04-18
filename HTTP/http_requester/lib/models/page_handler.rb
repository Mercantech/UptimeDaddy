class PageHandler
  UniqPageNeedingPing = Struct.new(:path, :pages, :response) do
    def initialize(path, pages, response = nil)
      super
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
    page = Page.new(change.page_id, change.path, change.interval_time, change.user_id)
    pages << page 
  end

  def update_page_from_change(change)
    page = pages.find { |p| p.id == change.page_id }
    if page
      page.path = change.path
      page.interval_time = change.interval_time
      logger.info("Updated page with id: #{change.page_id} to new path: #{change.path} and interval_time: #{change.interval_time}")
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
      unique_pages = pages.find_all(&:ready_for_ping?).group_by(&:normalize_path).map { |path, pages| UniqPageNeedingPing.new(path, pages) }
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