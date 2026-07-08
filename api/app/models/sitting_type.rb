class SittingType < ApplicationRecord
  has_many :sittings, dependent: :restrict_with_exception

  validates :name, presence: true, uniqueness: true
end
