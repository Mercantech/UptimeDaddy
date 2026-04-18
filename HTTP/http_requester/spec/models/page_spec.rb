# frozen_string_literal: true

require "spec_helper"
require_relative "../../lib/models/page"

RSpec.describe Page do
  describe "#normalize_path" do
    it "tilføjer https når der ikke er scheme" do
      # Arrange
      page = described_class.new(1, "example.com", 60, 99)

      # Act
      normalized = page.normalize_path

      # Assert
      expect(normalized).to eq("https://example.com")
    end

    it "erstat http med https" do
      # Arrange
      page = described_class.new(1, "http://example.com/path", 60, 99)

      # Act
      normalized = page.normalize_path

      # Assert
      expect(normalized).to eq("https://example.com/path")
    end

    it "bevarer https" do
      # Arrange
      page = described_class.new(1, "https://example.com", 60, 99)

      # Act
      normalized = page.normalize_path

      # Assert
      expect(normalized).to eq("https://example.com")
    end

    it "memoizerer resultatet" do
      # Arrange
      page = described_class.new(1, "a.dk", 60, 99)
      first = page.normalize_path
      page.path = "b.dk"

      # Act
      second = page.normalize_path

      # Assert
      expect(second).to eq(first)
    end
  end

  describe "#ready_for_ping?" do
    let(:t0) { Time.utc(2026, 4, 18, 10, 0, 0) }

    it "er false inden interval er gået" do
      # Arrange
      page = described_class.new(1, "x", 120, 1)
      page.last_ping_time = t0
      allow(Time).to receive(:now).and_return(t0 + 60)

      # Act
      ready = page.ready_for_ping?

      # Assert
      expect(ready).to be false
    end

    it "er true når interval er præcis nået" do
      # Arrange
      page = described_class.new(1, "x", 120, 1)
      page.last_ping_time = t0
      allow(Time).to receive(:now).and_return(t0 + 120)

      # Act
      ready = page.ready_for_ping?

      # Assert
      expect(ready).to be true
    end
  end

  describe "#update_last_ping_time!" do
    it "sætter last_ping_time til nu" do
      # Arrange
      now = Time.utc(2026, 4, 18, 12, 0, 0)
      allow(Time).to receive(:now).and_return(now)
      page = described_class.new(1, "x", 60, 1)

      # Act
      page.update_last_ping_time!

      # Assert
      expect(page.last_ping_time).to eq(now)
    end
  end

  describe "#to_json" do
    it "returnerer et serialiserbart map" do
      # Arrange
      page = described_class.new(42, "https://z.dk", 30, 7)

      # Act
      payload = page.to_json

      # Assert
      expect(payload).to eq(
        id: 42,
        path: "https://z.dk",
        user_id: 7
      )
    end
  end
end
