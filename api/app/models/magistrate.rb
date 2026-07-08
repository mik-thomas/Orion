class Magistrate < ApplicationRecord
  belongs_to :home_courthouse, class_name: "Courthouse", optional: true

  has_many :magistrate_sitting_locations, dependent: :destroy
  has_many :sitting_locations, through: :magistrate_sitting_locations, source: :courthouse
  has_many :leaves_of_absence, dependent: :destroy
  has_many :cases, dependent: :destroy
  has_many :sittings, dependent: :destroy

  validates :first_name, :last_name, presence: true

  def full_name
    "#{first_name} #{last_name}"
  end

  def active_leave?
    leaves_of_absence.active_on(Date.current).exists?
  end
end
