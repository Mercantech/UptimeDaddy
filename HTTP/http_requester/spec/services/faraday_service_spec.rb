# frozen_string_literal: true

require "spec_helper"
require "webmock/rspec"
require_relative "../../lib/services/faraday_service"

RSpec.describe FaradayService do
  describe ".get_favicon" do
    it "henter GET {url}/favicon.ico" do
      # Arrange
      stub_request(:get, "https://example.com/favicon.ico")
        .to_return(status: 200, body: "fake-ico")

      # Act
      response = described_class.get_favicon("https://example.com")

      # Assert
      expect(response.status).to eq(200)
      expect(response.body).to eq("fake-ico")
    end
  end

  describe ".get_response" do
    it "sender Bearer-token" do
      # Arrange
      stub_request(:get, "https://api.example.com/v1/ping")
        .with(headers: { "Authorization" => "Bearer secret-token" })
        .to_return(status: 204, body: "")

      # Act
      response = described_class.get_response("https://api.example.com/v1/ping", "secret-token")

      # Assert
      expect(response.status).to eq(204)
    end
  end

  describe ".get_bearer_token" do
    it "poster JSON med email/password fra ENV" do
      # Arrange
      allow(ENV).to receive(:fetch).and_call_original
      allow(ENV).to receive(:fetch).with("ADMIN_EMAIL").and_return("a@b.dk")
      allow(ENV).to receive(:fetch).with("ADMIN_PASSWORD").and_return("pw")

      stub_request(:post, "https://auth.example.com/token")
        .with(body: { "email" => "a@b.dk", "password" => "pw" }.to_json)
        .to_return(status: 200, body: '{"token":"x"}', headers: { "Content-Type" => "application/json" })

      # Act
      response = described_class.get_bearer_token("https://auth.example.com/token")

      # Assert
      expect(response.status).to eq(200)
    end
  end
end
