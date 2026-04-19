# frozen_string_literal: true

require "spec_helper"
require "open3"
require_relative "../../lib/services/curl_service"

RSpec.describe CurlService do
  let(:logger) { instance_double(Logger, error: nil, info: nil, warn: nil) }
  let(:target) { "https://example.com" }

  # Undgå flere curl-kald og sleep i eksisterende eksempler (standardretry er 3).
  around do |example|
    prev_attempts = ENV["HTTP_CHECK_MAX_ATTEMPTS"]
    ENV["HTTP_CHECK_MAX_ATTEMPTS"] = "1"
    example.run
    if prev_attempts.nil?
      ENV.delete("HTTP_CHECK_MAX_ATTEMPTS")
    else
      ENV["HTTP_CHECK_MAX_ATTEMPTS"] = prev_attempts
    end
  end

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

  describe "retry ved ikke-2xx" do
    let(:ok_status) { double("Process::Status", success?: true) }
    let(:stdout_500) do
      <<~OUT
        status:500
        dns_lookup:0.001
        total_time:0.01
      OUT
    end
    let(:stdout_200) do
      <<~OUT
        status:200
        dns_lookup:0.001
        total_time:0.05
      OUT
    end

    it "prøver igen og returnerer 200 hvis et senere forsøg lykkes" do
      ENV["HTTP_CHECK_MAX_ATTEMPTS"] = "3"
      ENV["HTTP_CHECK_RETRY_DELAY_SEC_MIN"] = "0"
      ENV["HTTP_CHECK_RETRY_DELAY_SEC_MAX"] = "0"
      allow(Kernel).to receive(:sleep)
      allow(Open3).to receive(:capture3).and_return(
        [stdout_500, "", ok_status],
        [stdout_200, "", ok_status]
      )

      begin
        result = described_class.get_hashed_response(target, logger)

        expect(result["status"]).to eq("200")
        expect(Open3).to have_received(:capture3).twice
      ensure
        ENV.delete("HTTP_CHECK_RETRY_DELAY_SEC_MIN")
        ENV.delete("HTTP_CHECK_RETRY_DELAY_SEC_MAX")
      end
    end
  end
end
