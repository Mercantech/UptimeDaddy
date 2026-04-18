# frozen_string_literal: true

require "spec_helper"
require "open3"
require_relative "../../lib/services/curl_service"

RSpec.describe CurlService do
  let(:logger) { instance_double(Logger, error: nil) }
  let(:target) { "https://example.com" }

  describe ".get_hashed_response" do
    let(:curl_stdout) do
      <<~OUT
        status:200
        dns_lookup:0.001
        connect_to_page:0.002
        tls_hand_shake:0.003
        time_to_first_byte:0.004
        total_time:0.05
      OUT
    end

    it "parser succesfuldt curl -w output" do
      # Arrange
      status = double("Process::Status", success?: true)
      allow(Open3).to receive(:capture3).and_return([curl_stdout, "", status])

      # Act
      result = described_class.get_hashed_response(target, logger)

      # Assert
      expect(result["status"]).to eq("200")
      expect(result["dns_lookup"]).to eq(1.0)
      expect(result["total_time"]).to eq(50.0)
      expect(Open3).to have_received(:capture3).with(a_string_matching(%r{curl.*https://example\.com}m))
    end

    it "returnerer syntetisk 500-svar når curl fejler" do
      # Arrange
      status = double("Process::Status", success?: false)
      allow(Open3).to receive(:capture3).and_return(["", "connection refused", status])
      expect(logger).to receive(:error).with(/Curl command failed for #{Regexp.escape(target)}/)

      # Act
      result = described_class.get_hashed_response(target, logger)

      # Assert
      expect(result["status"]).to eq("500")
      expect(result["total_time"]).to eq(0)
    end
  end
end
