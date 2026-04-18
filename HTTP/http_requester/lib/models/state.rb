class State

  attr_reader :logger, :mutex
  attr_accessor :changes
  
  def initialize(logger)
    @logger = logger
    @changes = []
    @mutex = Mutex.new
  end

  def changes?
    mutex.synchronize do
      !changes.empty?
    end
  end
  
  def add_change(change)
    mutex.synchronize do
      logger.info("Adding change: #{change.to_s}")
      self.changes << change
    end
  end
  
  def fetch_changes
    mutex.synchronize do
      current_changes = changes.dup
      changes.clear
      current_changes
    end
  end
  
  private
  
    def clean_changes!
      mutex.synchronize do
        logger.info("Clearing changes: #{changes.map(&:to_s).join(', ')}")
        changes.clear
      end
    end
end