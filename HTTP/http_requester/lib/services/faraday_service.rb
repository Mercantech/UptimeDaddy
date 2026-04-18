class FaradayService
  attr_accessor :destanation_path

  class << self
    def get_bearer_token(destanation_path)
      new(destanation_path).get_bearer_token
    end
  
    def get_response(destanation_path, token)
      new(destanation_path).get_response(token)
    end

    def get_favicon(destanation_path)
      new(destanation_path).get_favicon 
    end
  end
  
  def initialize(destanation_path)
    @destanation_path = destanation_path
  end

  def get_favicon
    faraday_client.get("#{destanation_path}/favicon.ico")
  end
  
  def get_response(token)
    faraday_client.get(destanation_path) do |req|
      req.headers['Authorization'] = "Bearer #{token}"
    end
  end

  def get_bearer_token
    faraday_client.post(destanation_path) do |req|
      req.headers['Content-Type'] = 'application/json'
      req.body = {email: ENV.fetch("ADMIN_EMAIL"), password: ENV.fetch("ADMIN_PASSWORD")}.to_json
    end
  end

  private

  def faraday_client
    @faraday_client ||= begin
      Faraday.new do |faraday|
        faraday.response :follow_redirects
        faraday.adapter Faraday.default_adapter
        faraday.options.timeout = 10
        faraday.options.open_timeout = 5
      end
    end
  end

end