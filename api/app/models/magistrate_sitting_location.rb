class MagistrateSittingLocation < ApplicationRecord
  belongs_to :magistrate
  belongs_to :courthouse

  validates :courthouse_id, uniqueness: { scope: :magistrate_id }
end
