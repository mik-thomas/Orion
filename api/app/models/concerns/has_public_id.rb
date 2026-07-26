# frozen_string_literal: true

# Assigns stable human-readable public IDs (e.g. CA-000001) after create.
# Format is derived from the primary key so backfills stay consistent.
module HasPublicId
  extend ActiveSupport::Concern

  class_methods do
    attr_reader :public_id_prefix, :public_id_width

    def formats_public_id(prefix:, width:)
      @public_id_prefix = prefix
      @public_id_width = width
    end

    def format_public_id(record_id)
      format("%s-%0#{public_id_width}d", public_id_prefix, record_id)
    end

    def find_by_id_or_public_id!(identifier)
      value = identifier.to_s.strip
      record = find_by(public_id: value)
      record ||= find_by(id: value) if value.match?(/\A\d+\z/)
      record || raise(ActiveRecord::RecordNotFound, "Couldn't find #{name} with id or public_id=#{identifier.inspect}")
    end
  end

  included do
    validates :public_id, uniqueness: true, allow_nil: true
    after_create :assign_public_id!
  end

  def assign_public_id!
    return if public_id.present?

    update_column(:public_id, self.class.format_public_id(id))
  end
end
