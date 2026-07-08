class Magistrate < ApplicationRecord
  belongs_to :home_courthouse, class_name: "Courthouse", optional: true

  has_many :magistrate_sitting_locations, dependent: :destroy
  has_many :sitting_locations, through: :magistrate_sitting_locations, source: :courthouse
  has_many :leaves_of_absence, class_name: "LeaveOfAbsence", dependent: :destroy
  has_many :cases, dependent: :destroy
  has_many :sittings, dependent: :destroy
  has_many :training_records, dependent: :destroy

  validates :first_name, :last_name, presence: true
  validates :cluster, :bench, presence: true

  def full_name
    "#{first_name} #{last_name}"
  end

  def appraisal_due_years
    appraisal_cycle_years || (presiding_justice? ? 2 : 3)
  end

  def active_leave?
    leaves_of_absence.active_on(Date.current).exists?
  end

  def compliance_violations(as_of: Date.current)
    Orion::MagistrateCompliance.violations_for(self, as_of:)
  end
end
