class Page
  attr_accessor  :path, :interval_time, :id, :last_ping_time, :user_id, :normalize_path, :have_icon

  def initialize(id, path, interval_time, user_id, have_icon = false)
    @id = id
    @path = path
    @interval_time = interval_time
    @last_ping_time = Time.now
    @user_id = user_id
    @have_icon = have_icon
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
    }
  end
end