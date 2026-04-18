require "faraday"
require "faraday/retry"
require 'json'
require 'logger'
require "mqtt"
require "thread"
require "open3"
require "dotenv"
require "faraday/follow_redirects"
require "base64"
Dotenv.load(File.expand_path("../../.env", __dir__))

Dir[File.join(__dir__, "**/*.rb")].each do |file|
  next if file == __FILE__
  require file
end