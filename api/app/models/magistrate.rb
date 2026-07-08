class Magistrate < ApplicationRecord
  belongs_to :home_courthouse, class_name: "Courthouse", optional: true

  has_many :magistrate_sitting_locations, dependent: :destroy
  has_many :sitting_locations, through: :magistrate_sitting_locations, source: :courthouse
  has_many :leaves_of_absence, class_name: "LeaveOfAbsence", dependent: :destroy
  has_many :cases, dependent: :destroy
  has_many :sittings, dependent: :destroy
  has_many :training_records, dependent: :destroy

  scope :on_leave, lambda {
    joins(:leaves_of_absence).merge(LeaveOfAbsence.active_on(Date.current)).distinct
  }

  validates :first_name, :last_name, presence: true
  validates :cluster, :bench, presence: true

  def full_name
    "#{first_name} #{last_name}"
  end

  def appraisal_due_years
    appraisal_cycle_years || (presiding_justice? ? 2 : 3)
  end

  def active_leave?
    current_leaves.exists?
  end

  def current_leaves
    today = Date.current
    active = if leaves_of_absence.loaded?
               leaves_of_absence.select do |leave|
                 leave.starts_on <= today && (leave.ends_on.nil? || leave.ends_on >= today)
               end
             else
               leaves_of_absence.active_on(today).to_a
             end

    active.sort_by(&:starts_on).reverse
  end

  def compliance_violations(as_of: Date.current)
    Orion::MagistrateCompliance.violations_for(self, as_of:)
  end
end
