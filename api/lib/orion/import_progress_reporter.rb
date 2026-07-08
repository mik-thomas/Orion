# frozen_string_literal: true

module Orion
  class ImportProgressReporter
    def initialize
      @phase_total = 0
      @phase_processed = 0
      @phase_label = ""
      @last_percent = -1
      @phase_started_at = nil
    end

    def phase(label, total)
      @phase_label = label
      @phase_total = total
      @phase_processed = 0
      @last_percent = -1
      @phase_started_at = Process.clock_gettime(Process::CLOCK_MONOTONIC)
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
      rate_line = throughput_hint(processed, total)
      $stdout.puts format(
        "[Orion Import] %s %d%% (%d/%d)%s — %s",
        progress_bar(percent),
        percent,
        processed,
        total,
        rate_line,
        @phase_label
      )
      $stdout.flush
    end

    def throughput_hint(processed, total)
      return "" unless @phase_started_at && processed.positive? && processed < total

      elapsed = Process.clock_gettime(Process::CLOCK_MONOTONIC) - @phase_started_at
      return "" if elapsed <= 0

      rate = processed / elapsed
      remaining = total - processed
      eta_seconds = remaining / rate
      format(" ~%.0f rows/s ETA %s", rate, format_duration(eta_seconds))
    end

    def format_duration(seconds)
      seconds = seconds.ceil
      return "#{seconds}s" if seconds < 60

      minutes = seconds / 60
      secs = seconds % 60
      return "#{minutes}m #{secs}s" if minutes < 60

      hours = minutes / 60
      mins = minutes % 60
      "#{hours}h #{mins}m"
    end

    def progress_bar(percent)
      filled = [(percent * BAR_WIDTH) / 100, BAR_WIDTH].min
      "[" + ("█" * filled) + ("░" * (BAR_WIDTH - filled)) + "]"
    end
  end
end
