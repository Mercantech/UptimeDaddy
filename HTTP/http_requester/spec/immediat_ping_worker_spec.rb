require "spec_helper"
require_relative "../lib/models/immediate_ping_worker"
require_relative "../lib/services/curl_service"
require_relative "../lib/services/faraday_service"
require "json"
require "base64"

RSpec.describe ImmediatePingWorker do
  let(:logger) { double("Logger", info: nil, error: nil) }
  let(:publish_result) { double("publish_result") }

  subject(:worker) { described_class.new(logger, publish_result) }

  describe "#enqueue_page" do
    let(:page) { double("Page", path: "example.com") }

    it "logs and adds the page to the queue" do
      expect(logger).to receive(:info).with("Enqueuing page for immediate ping: example.com")

      expect {
        worker.enqueue_page(page)
      }.to change { worker.queue.size }.by(1)
    end
  end
  describe "#quick_ping" do
    let(:page) do
      double(
        "Page",
        path: "https://example.com",
        request_id: "abc123"
      )
    end

    let(:response) do
      { status: 200, hash: "xyz" }
    end

    it "performs a quick ping and publishes result" do
      allow(Thread).to receive(:new).and_yield

      allow(CurlService).to receive(:get_hashed_response)
        .with("https://example.com", logger)
        .and_return(response)

      allow(publish_result).to receive(:call)

      worker.quick_ping(page, "uptime/topic", "quick_ping")

      expect(logger).to have_received(:info)
        .with("Performing quick ping for page: https://example.com")

      expect(publish_result).to have_received(:call).with(
        "uptime/topic",
        {
          "type": "quick_ping",
          "requestId": "abc123",
          "path": "https://example.com",
          status: 200,
          hash: "xyz"
        }.to_json
      )
    end
  end
  describe "#process_next_page" do
    let(:page) do
      double(
        "Page",
        path: "example.com",
        page_id: 1,
        user_id: 42
      )
    end

    let(:curl_response) do
      { status: 200, hash: "abc123" }
    end

    let(:favicon_response) do
      double("FaviconResponse", body: "icon-bytes")
    end

    it "processes the next page from the queue and publishes results" do
      allow(worker.queue).to receive(:pop).and_return(page)

      allow(CurlService).to receive(:get_hashed_response)
        .with("https://example.com", logger)
        .and_return(curl_response)

      allow(FaradayService).to receive(:get_favicon)
        .with("https://example.com")
        .and_return(favicon_response)

      allow(publish_result).to receive(:call)

      worker.send(:process_next_page)

      expect(logger).to have_received(:info)
        .with("Processing immediate ping for page: example.com")

      expect(publish_result).to have_received(:call).with(
        "uptime/measurements",
        {
          pages: [
            {
              id: 1,
              path: "example.com",
              user_id: 42,
              response: curl_response
            }
          ]
        }.to_json
      )

      expect(publish_result).to have_received(:call).with(
        "uptime/update_favicon",
        {
          id: 1,
          path: "example.com",
          user_id: 42,
          favicon: Base64.strict_encode64("icon-bytes")
        }.to_json
      )
    end
  end
end