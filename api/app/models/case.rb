class Case < ApplicationRecord
  belongs_to :magistrate
  has_many :notes, dependent: :destroy

  STATUSES = %w[open closed].freeze

  validates :title, presence: true
  validates :status, inclusion: { in: STATUSES }
end
