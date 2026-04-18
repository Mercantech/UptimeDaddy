require "spec_helper"
require_relative "../lib/models/page_handler"
require_relative "../lib/models/page"

RSpec.describe PageHandler do
  let(:logger) { double("Logger", info: nil, warn: nil, error: nil) }
  subject(:page_handler) { described_class.new(logger) }
  let(:page1) { Page.new(1, "example.com", 60, 123) }
  let(:page2) { Page.new(2, "dr.dk", 30, 123) }
  let(:change1) { double("Change", page_id: 1, path: "test.com", interval_time: 45, user_id: 123) }
  let(:change2) { double("Change", page_id: 2, path: "tv2.dk", interval_time: 15, user_id: 123) }

  describe "#add_page_from_change" do
    it "adds a page to the handler" do
      expect(page_handler.pages).to be_empty

      page_handler.add_page_from_change(change1)
      page_handler.add_page_from_change(change2)

      expect(page_handler.pages.size).to eq(2)
      expect(page_handler.pages.first.id).to eq(1)
      expect(page_handler.pages.first.path).to eq("test.com")
      expect(page_handler.pages.first.interval_time).to eq(45)
      expect(page_handler.pages.first.user_id).to eq(123)
    end
  end

  describe "#update_page_from_change" do
    before do
      page_handler.pages << page1
    end 
    it "updates an existing page" do
      page_handler.pages << page1
      page_handler.update_page_from_change(change1)

      expect(logger).to have_received(:info).with("Updated page with id: 1 to new path: test.com and interval_time: 45")
      expect(page_handler.pages.first.path).to eq("test.com")
      expect(page_handler.pages.first.interval_time).to eq(45)
    end
  end

  describe "#remove_page_from_change" do
    before do
      page_handler.pages << page1
      page_handler.pages << page2
    end

    it "removes a page from the handler" do
      page_handler.remove_page_from_change(change1)

      expect(page_handler.pages.size).to eq(1)
      expect(page_handler.pages.first.id).to eq(2)
    end
  end

  describe "uniq_pages_needing_ping" do
    before do
      page_handler.pages << page1
      page_handler.pages << page2
    end

    it "returns unique pages that are ready for ping" do
      allow(page1).to receive(:ready_for_ping?).and_return(true)
      allow(page2).to receive(:ready_for_ping?).and_return(true)

      uniq_pages = page_handler.uniq_pages_needing_ping

      expect(uniq_pages.size).to eq(2)
      expect(uniq_pages.first.path).to eq("https://example.com")
      expect(uniq_pages.first.pages).to include(page1)
      expect(uniq_pages.last.path).to eq("https://dr.dk")
      expect(uniq_pages.last.pages).to include(page2)
    end

    it "returns nil if no pages are ready for ping" do
      allow(page1).to receive(:ready_for_ping?).and_return(false)
      allow(page2).to receive(:ready_for_ping?).and_return(false)

      uniq_pages = page_handler.uniq_pages_needing_ping

      expect(uniq_pages).to be_nil
    end
    
  end
  
end
