class ImmediatePingWorker

  attr_reader :logger, :queue, :publish_result

  def initialize(logger, publish_result)
    @logger = logger
    @queue = Queue.new
    @publish_result = publish_result
  end
  
  def start!
    Thread.new do
      loop do
        begin
          process_next_page
        rescue => e
          logger.error("Error processing immediate ping: #{e.class} - #{e.message}\n#{e.backtrace.join("\n")}")
        end
      end
    end
  end

  def quick_ping(page, topic, type)
    Thread.new do
      begin
        logger.info("Performing quick ping for page: #{page.path}")
        response = CurlService.get_hashed_response(page.path, logger)
        publish_result.call(topic, {"type": type, "requestId": page.request_id, "path": page.path}.merge(response).to_json)
      rescue => e
        logger.error("Error performing quick ping for #{page.path}: #{e.class} \n #{e.backtrace.join("\n")}")
      end
    end
  end

  def enqueue_page(page)
    logger.info("Enqueuing page for immediate ping: #{page.path}")
    queue << page
  end

  private

  def process_next_page
    page = queue.pop
    path = page.path.start_with?("https") ? page.path : "https://#{page.path}"
    logger.info("Processing immediate ping for page: #{page.path}")
    curl_response = CurlService.get_hashed_response(path, logger)
    page_hash = { id: page.page_id, path: page.path, user_id: page.user_id }
    publish_result.call("uptime/measurements", { pages: [page_hash.merge(response: curl_response)] }.to_json)
    favicon_response = FaradayService.get_favicon(path)
    publish_result.call("uptime/update_favicon", page_hash.merge(favicon: Base64.strict_encode64(favicon_response.body)).to_json)
  end
end