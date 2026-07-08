# frozen_string_literal: true

require "json"
require "fileutils"

module Orion
  class ImportCheckpoint
    class << self
      def path
        Rails.root.join("tmp/orion_import_checkpoint.json")
      end
    end

    def initialize(root:, importer_version:)
      @root = File.expand_path(root.to_s)
      @importer_version = importer_version
      @data = nil
    end

    def exists?
      File.exist?(self.class.path)
    end

    def synthetic?
      data["synthetic"] == true
    end

    def load!
      raise "No import checkpoint at #{self.class.path}" unless exists?

      @data = JSON.parse(File.read(self.class.path))
      validate!
      @data
    end

    def synthesize!
      @data = new_state
      @data["synthetic"] = true
      yield self if block_given?
      persist!
      @data
    end

    def reset!
      @data = new_state
      persist!
    end

    def clear!
      FileUtils.rm_f(self.class.path)
      @data = nil
    end

    def flush!
      persist! if @data
    end

    def phase_complete?(key)
      phases.dig(key.to_s, "status") == "completed"
    end

    def rows_processed(key)
      phases.dig(key.to_s, "rows_processed").to_i
    end

    def start_phase!(key, total: nil)
      entry = phases[key.to_s] ||= {}
      entry["status"] = "in_progress"
      entry["rows_total"] = total unless total.nil?
      entry["started_at"] ||= Time.current.iso8601
      touch!
      persist!
    end

    def save_progress!(key, processed, total: nil)
      entry = phases[key.to_s] ||= { "status" => "in_progress" }
      entry["rows_processed"] = processed
      entry["rows_total"] = total unless total.nil?
      touch!
      persist!
    end

    def complete_phase!(key)
      entry = phases[key.to_s] ||= {}
      entry["status"] = "completed"
      entry["completed_at"] = Time.current.iso8601
      touch!
      persist!
    end

    def completed_phase_keys
      phases.filter_map { |key, value| key if value["status"] == "completed" }
    end

    def updated_at
      data["updated_at"]
    end

    private

    def phases
      data.fetch("phases")
    end

    def data
      @data ||= exists? ? JSON.parse(File.read(self.class.path)) : new_state
    end

    def new_state
      {
        "root" => @root,
        "importer_version" => @importer_version,
        "started_at" => Time.current.iso8601,
        "updated_at" => Time.current.iso8601,
        "phases" => {}
      }
    end

    def validate!
      if data["root"] != @root
        raise "Checkpoint import root #{data['root'].inspect} does not match #{@root.inspect}"
      end

      stored_version = data["importer_version"]
      return if stored_version.blank? || stored_version == @importer_version

      warn(
        "Checkpoint importer version #{stored_version} differs from current #{@importer_version}"
      )
    end

    def touch!
      data["updated_at"] = Time.current.iso8601
    end

    def persist!
      FileUtils.mkdir_p(self.class.path.dirname)
      File.write(self.class.path, JSON.pretty_generate(data))
    end
  end
end
