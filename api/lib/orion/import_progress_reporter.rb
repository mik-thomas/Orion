# frozen_string_literal: true

module Orion
  class ImportProgressReporter
    def initialize
      @phase_total = 0
      @phase_processed = 0
      @phase_label = ""
      @last_percent = -1
    end

    def phase(label, total)
      @phase_label = label
      @phase_total = total
      @phase_processed = 0
      @last_percent = -1
      print_progress(force: true)
      self
    end

    def tick(count = 1)
      @phase_processed += count
      print_progress
    end

    def finish_phase
      return if @phase_total.zero?

      @phase_processed = @phase_total
      print_progress(force: true)
    end

    def message(text)
      $stdout.puts "[Orion Import] #{text}"
      $stdout.flush
    end

    def warn(text)
      $stderr.puts "[Orion Import] WARNING: #{text}"
      $stderr.flush
    end

    private

    BAR_WIDTH = 20

    def print_progress(force: false)
      total = @phase_total
      processed = @phase_processed
      percent = total.zero? ? 100 : [(processed * 100) / total, 100].min
      return if !force && percent == @last_percent && processed < total

      @last_percent = percent
      $stdout.puts format(
        "[Orion Import] %s %d%% (%d/%d) — %s",
        progress_bar(percent),
        percent,
        processed,
        total,
        @phase_label
      )
      $stdout.flush
    end

    def progress_bar(percent)
      filled = [(percent * BAR_WIDTH) / 100, BAR_WIDTH].min
      "[" + ("█" * filled) + ("░" * (BAR_WIDTH - filled)) + "]"
    end
  end
end
