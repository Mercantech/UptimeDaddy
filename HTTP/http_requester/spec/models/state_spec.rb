# frozen_string_literal: true

require "spec_helper"
require_relative "../../lib/models/state"

RSpec.describe State do
  let(:logger) { instance_double(Logger, info: nil) }
  subject(:state) { described_class.new(logger) }
  let(:change) { instance_double("Change", to_s: "change-1") }

  describe "#changes?" do
    it "er false når køen er tom" do
      # Act
      has_changes = state.changes?

      # Assert
      expect(has_changes).to be false
    end

    it "er true når der er ændringer" do
      # Arrange
      state.add_change(change)

      # Act
      has_changes = state.changes?

      # Assert
      expect(has_changes).to be true
    end
  end

  describe "#add_change" do
    it "tilføjer til listen og logger" do
      # Arrange
      expect(logger).to receive(:info).with("Adding change: change-1")

      # Act
      state.add_change(change)

      # Assert
      expect(state.changes).to eq([change])
    end
  end

  describe "#fetch_changes" do
    it "returnerer en kopi og tømmer køen" do
      # Arrange
      state.add_change(change)

      # Act
      fetched = state.fetch_changes

      # Assert
      expect(fetched).to eq([change])
      expect(state.changes).to be_empty
      expect(state.changes?).to be false
    end

    it "returnerer tom array når der intet er" do
      # Act
      fetched = state.fetch_changes

      # Assert
      expect(fetched).to eq([])
    end
  end
end
