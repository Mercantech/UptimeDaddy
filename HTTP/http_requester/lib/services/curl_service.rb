require "open3"
require "uri"
require "time"

class CurlService
  DEFAULT_MAX_ATTEMPTS = 3
  DEFAULT_RETRY_DELAY_MIN_SEC = 5
  DEFAULT_RETRY_DELAY_MAX_SEC = 10
  MAX_BODY_BYTES = 65_536

  def self.get_hashed_response(target_path, logger, keyword: nil, keyword_must_contain: true)
    get_hashed_response_with_retries(target_path, logger, keyword: keyword, keyword_must_contain: keyword_must_contain)
  end

  def self.get_hashed_response_with_retries(target_path, logger, keyword: nil, keyword_must_contain: true)
    max_attempts = env_int("HTTP_CHECK_MAX_ATTEMPTS", DEFAULT_MAX_ATTEMPTS).clamp(1, 10)
    delay_min = env_int("HTTP_CHECK_RETRY_DELAY_SEC_MIN", DEFAULT_RETRY_DELAY_MIN_SEC)
    delay_max = env_int("HTTP_CHECK_RETRY_DELAY_SEC_MAX", DEFAULT_RETRY_DELAY_MAX_SEC)
    delay_max = delay_min if delay_max < delay_min

    last_response = nil
    max_attempts.times do |i|
      last_response = new(target_path, logger, keyword: keyword, keyword_must_contain: keyword_must_contain).formated_response
      status = last_response["status"].to_i
      keyword_ok = last_response["keyword_matched"].nil? || last_response["keyword_matched"] == true

      if status >= 200 && status < 300 && keyword_ok
        logger.info("HTTP #{status} for #{target_path} (forsøg #{i + 1}/#{max_attempts})") if i.positive?
        return last_response
      end

      break if i >= max_attempts - 1

      delay = rand(delay_min..delay_max)
      logger.warn(
        "HTTP #{status} for #{target_path} — prøver igen om #{delay}s (#{i + 1}/#{max_attempts})"
      )
      sleep(delay)
    end

    last_response
  end

  def self.ssl_expires_at_for(target_path, logger)
    uri = URI.parse(target_path.start_with?("http") ? target_path : "https://#{target_path}")
    host = uri.host
    port = uri.port || 443
    return nil if host.nil?

    cmd = "echo | openssl s_client -servername #{host} -connect #{host}:#{port} 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null"
    stdout, _stderr, status = Open3.capture3(cmd)
    return nil unless status.success?

    line = stdout.strip
    return nil unless line.start_with?("notAfter=")

    Time.parse(line.sub("notAfter=", "")).utc
  rescue => e
    logger.warn("SSL expiry check failed for #{target_path}: #{e.message}")
    nil
  end

  def self.env_int(key, default)
    v = ENV[key]
    return default if v.nil? || v.strip.empty?

    Integer(v)
  rescue ArgumentError
    default
  end

  def initialize(target_path, logger, keyword: nil, keyword_must_contain: true)
    @target_path = target_path
    @logger = logger
    @keyword = keyword
    @keyword_must_contain = keyword_must_contain.nil? ? true : keyword_must_contain
  end

  def curl_response_with_ms_lookup
    @curl_response_with_ms_lookup ||= begin
      if @keyword.nil? || @keyword.strip.empty?
        stdout, stderr, status = Open3.capture3("curl -s -o /dev/null #{curl_write_ms_response} #{@target_path}")
      else
        body_file = Tempfile.new(["uptime_body", ".txt"])
        begin
          stdout, stderr, status = Open3.capture3(
            "curl -s -L #{curl_write_ms_response} -o #{body_file.path} --max-filesize #{MAX_BODY_BYTES} #{@target_path}"
          )
          @body = File.read(body_file.path)
        ensure
          body_file.close!
        end
      end

      unless status.success?
        @logger.error("Curl command failed for #{@target_path} #{stderr}")
        return "status:500\ndns_lookup:0\nconnect_to_page:0\ntls_hand_shake:0\ntime_to_first_byte:0\ntotal_time:0\n"
      end

      stdout
    end
  end

  def formated_response
    curl_response = {}
    curl_response_with_ms_lookup.split("\n").map do |line|
      key, value = line.split(":")
      key == "status" ? curl_response[key] = value : curl_response[key] = (value.to_f * 1000).round(2)
    end

    if @keyword && !@keyword.strip.empty?
      body = @body.to_s
      contains = body.include?(@keyword)
      matched = @keyword_must_contain ? contains : !contains
      curl_response["keyword_matched"] = matched
      unless matched
        curl_response["status"] = "0"
      end
    end

    curl_response
  end

  private

  def curl_write_ms_response
    '-L -w "status:%{http_code}\ndns_lookup:%{time_namelookup}\nconnect_to_page:%{time_connect}\ntls_hand_shake:%{time_appconnect}\ntime_to_first_byte:%{time_starttransfer}\ntotal_time:%{time_total}\n" --connect-timeout 5 --max-time 10'
  end
end
