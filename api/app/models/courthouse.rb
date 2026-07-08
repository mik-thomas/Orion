class Courthouse < ApplicationRecord
  has_many :magistrates, foreign_key: :home_courthouse_id, inverse_of: :home_courthouse
  has_many :magistrate_sitting_locations, dependent: :destroy
  has_many :sitting_magistrates, through: :magistrate_sitting_locations, source: :magistrate
  has_many :sittings, dependent: :restrict_with_exception

  validates :name, presence: true, uniqueness: true
end
