class Page
  attr_accessor :path, :interval_time, :id, :last_ping_time, :user_id, :normalize_path, :have_icon,
                :request_id, :monitor_id, :base_url, :keyword, :keyword_must_contain

  def initialize(id, full_url, interval_time, user_id, have_icon = false, monitor_id: nil, base_url: nil,
                 keyword: nil, keyword_must_contain: true)
    @id = id
    @path = full_url
    @interval_time = interval_time
    @last_ping_time = Time.now
    @user_id = user_id
    @have_icon = have_icon
    @request_id = nil
    @monitor_id = monitor_id
    @base_url = base_url
    @keyword = keyword
    @keyword_must_contain = keyword_must_contain.nil? ? true : keyword_must_contain
  end

  def ready_for_ping?
    Time.now - last_ping_time >= interval_time
  end

  def update_last_ping_time!
    self.last_ping_time = Time.now
  end

  def normalize_path
    @normalize_path ||= begin
      normalized =
        if !path.start_with?("http://", "https://")
          "https://#{path}"
        elsif path.start_with?("http://")
          path.sub("http://", "https://")
        else
          path
        end
    end
  end

  def to_json
    {
      id: id,
      path: path,
      user_id: user_id,
      monitor_id: monitor_id
    }
  end
end
