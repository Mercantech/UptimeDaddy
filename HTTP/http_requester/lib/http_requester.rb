class HttpRequester
  
  attr_accessor :logger, :stop, :state, :page_handler, :mqtt_broker, :immediate_ping_worker

  def initialize
    @logger = Logger.new($stdout)
    @stop = false
    @state = State.new(logger)
    @page_handler = PageHandler.new(logger)
  end
  
  def execute 
    start_immediate_ping_worker!
    start_mqtt_client!
    load_websites_from_api!
    fetch_missing_favicons!
 
    until stop
      begin
        update_page_handler! if state.changes?
        run_curl_on_pages! if page_handler.pages_needing_ping?
      rescue => e
        logger.error("An error occurred in event loop: #{e.message} \n #{e.backtrace.join("\n")}")
      end
      sleep(5)
    end
  end
  
  private

  def fetch_missing_favicons!
    page_handler.pages.each do |page|
      unless page.have_icon
        logger.info("Fetching favicon for #{page.normalize_path}")
        begin
          response = FaradayService.get_favicon(page.normalize_path)
          if response.success?
            logger.info("Successfully fetched favicon for #{page.normalize_path}")
            page.have_icon = true
            mqtt_broker.enqueue_publish(topic: "uptime/update_favicon", payload: page.to_json.merge(favicon: Base64.strict_encode64(response.body)).to_json)
          else
            logger.warn("Failed to fetch favicon for #{page.normalize_path}: HTTP #{response.status}")
            page.have_icon = true
          end
        rescue => e
          logger.error("Failed to fetch favicon for #{page.normalize_path}: #{e.message}\n#{e.backtrace.join("\n")}")
        end
      end
    end
  end
  
  def report_ping_response_to_mqtt!
    pages_json_array = page_handler.uniq_pages_needing_ping.flat_map do |uniq_page|
      pages = []
      uniq_page.pages.each(&:update_last_ping_time!)
      pages_json = uniq_page.pages.map do |page|
        page.to_json.merge(response: uniq_page.response)
      end
      pages << pages_json
      pages
    end.flatten
    mqtt_broker.enqueue_publish(topic: "uptime/measurements", payload: {pages: pages_json_array}.to_json)
  rescue => e
    logger.error("Failed to report ping response to MQTT: #{e.message}\n #{e.backtrace.join("\n")}")
  end

  def load_websites_from_api!
    logger.info("Loading websites from API...")
    legacy_host = ENV["HOST"]
    legacy_host = "localhost" if legacy_host.nil? || legacy_host.strip.empty?
    accounts_host = ENV["ACCOUNTS_HOST"]
    accounts_host = legacy_host if accounts_host.nil? || accounts_host.strip.empty?
    api_host = ENV["API_HOST"]
    api_host = legacy_host if api_host.nil? || api_host.strip.empty?
    login_url = "http://#{accounts_host}:#{ENV['PORT_ACCOUNT']}/accounts/login"
    response = FaradayService.get_bearer_token(login_url)
    unless response.success?
      logger.error(
        "Admin login failed: HTTP #{response.status} from #{login_url}. " \
        "Sæt ADMIN_EMAIL og ADMIN_PASSWORD til præcis samme bruger som findes i databasen " \
        "(opret med POST /accounts/register hvis nødvendigt). Body: #{response.body.to_s.strip[0, 300]}"
      )
      self.stop = true
      return
    end
    token = JSON.parse(response.body).fetch("accessToken")
    api_response = FaradayService.get_response("http://#{api_host}:#{ENV['PORT_WEBSITES']}/api/Websites", token)
    JSON.parse(api_response.body).each do |page|
      page_handler.pages << Page.new(page.fetch("id"), page.fetch("url"), page.fetch("intervalTime"), page.fetch("userId"), page.fetch("faviconBase64") == nil ? false : true)
    end
      logger.info("Loaded pages: #{page_handler.pages.map(&:path).join(', ')}")
  rescue Faraday::ConnectionFailed => e
    logger.error("Failed to connect to API: #{e.message}")
    self.stop = true
  rescue JSON::ParserError => e
    logger.error("Failed to parse JSON: #{e.message}")
    logger.error("Login status: #{response&.status}")
    logger.error("Login body: #{response&.body.inspect}")
    logger.error("Websites status: #{api_response&.status}")
    logger.error("Websites body: #{api_response&.body.inspect}")
    self.stop = true
  rescue KeyError => e
    logger.error("Missing expected key in API response: #{e.message}")
    self.stop = true
  rescue => e
    logger.error("Unexpected error: #{e.message}\n #{e.backtrace.join("\n")}")
    self.stop = true
  end

  def start_immediate_ping_worker!
    self.immediate_ping_worker = ImmediatePingWorker.new(logger, ->(topic, payload) {
    mqtt_broker.enqueue_publish(topic: topic, payload: payload)
  })
    immediate_ping_worker.start!
  end
  
  def start_mqtt_client!
    self.mqtt_broker = MqttBroker.new(logger, state, immediate_ping_worker)
    mqtt_broker.start!
  end
  
  def update_page_handler!
    state.fetch_changes.each do |change|
      case change.type
      when "website_created"
        page_handler.add_page_from_change(change)
        logger.info("Added page: #{change.path}")
      when "website_deleted"
        page_handler.remove_page_from_change(change)
        logger.info("Removed page with id: #{change.page_id}")
      when "website_updated"
        page_handler.update_page_from_change(change)
        logger.info("Updated page with id: #{change.page_id}")
      else
        logger.warn("Unknown change type: #{change.type}")
      end
    end
  end
  
def run_curl_on_pages!
  max_threads = ENV.fetch("MAX_THREADS", 5).to_i
  queue = Queue.new

  page_handler.uniq_pages_needing_ping.each do |uniq_page|
    queue << uniq_page
  end

  threads = max_threads.times.map do
    Thread.new do
      loop do
          begin
            uniq_page = queue.pop(true)
          rescue ThreadError
            break
          end
        begin
          logger.info("Pinging #{uniq_page.path} for #{uniq_page.pages.size} page(s)")
          response = CurlService.get_hashed_response(uniq_page.path, logger)
          uniq_page.response = response
          logger.info("Received response for #{uniq_page.path}: #{response}")
        rescue => e
          logger.error("Failed to ping #{uniq_page.path}: #{e.class} - #{e.message}")
        end
      end
    end
  end

  threads.each(&:join)

  report_ping_response_to_mqtt!
  page_handler.uniq_pages_needing_ping = nil
rescue => e
  logger.error("Failed to ping pages: #{e.message}\n#{e.backtrace.join("\n")}")
end
end