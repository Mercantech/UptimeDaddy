# frozen_string_literal: true

require "spec_helper"
require_relative "../../lib/models/page"
require_relative "../../lib/models/immediate_ping_worker"
require_relative "../../lib/services/curl_service"
require_relative "../../lib/services/faraday_service"
require "json"
require "base64"

RSpec.describe ImmediatePingWorker do
  let(:logger) { instance_double(Logger, info: nil, error: nil) }
  let(:publish_result) { instance_double(Proc) }

  subject(:worker) { described_class.new(logger, publish_result) }

  describe "#enqueue_page" do
    let(:page) { instance_double(Page, path: "example.com") }

    it "logger og lægger siden i køen" do
      # Arrange
      expect(logger).to receive(:info).with("Enqueuing page for immediate ping: example.com")

      # Act & Assert
      expect do
        worker.enqueue_page(page)
      end.to change { worker.queue.size }.by(1)
    end
  end

  describe "#quick_ping" do
    let(:page) do
      instance_double(
        Page,
        path: "https://example.com",
        request_id: "abc123"
      )
    end

    let(:response) { { status: 200, hash: "xyz" } }

    it "udfører quick ping og publicerer resultat" do
      # Arrange
      allow(Thread).to receive(:new).and_yield
      allow(CurlService).to receive(:get_hashed_response)
        .with("https://example.com", logger)
        .and_return(response)
      allow(publish_result).to receive(:call)

      # Act
      worker.quick_ping(page, "uptime/topic", "quick_ping")

      # Assert
      expect(logger).to have_received(:info)
        .with("Performing quick ping for page: https://example.com")

      expect(publish_result).to have_received(:call) do |topic, payload|
        expect(topic).to eq("uptime/topic")
        data = JSON.parse(payload)
        expect(data).to include(
          "type" => "quick_ping",
          "requestId" => "abc123",
          "path" => "https://example.com",
          "status" => 200,
          "hash" => "xyz"
        )
      end
    end
  end

  describe "#process_next_page" do
    let(:page) do
      instance_double(
        Page,
        path: "example.com",
        page_id: 1,
        user_id: 42
      )
    end

    let(:curl_response) { { status: 200, hash: "abc123" } }

    let(:favicon_response) { instance_double(Faraday::Response, body: "icon-bytes") }

    it "behandler næste side og publicerer måling + favicon" do
      # Arrange
      allow(worker.queue).to receive(:pop).and_return(page)
      allow(CurlService).to receive(:get_hashed_response)
        .with("https://example.com", logger)
        .and_return(curl_response)
      allow(FaradayService).to receive(:get_favicon)
        .with("https://example.com")
        .and_return(favicon_response)
      allow(publish_result).to receive(:call)

      # Act
      worker.send(:process_next_page)

      # Assert
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
