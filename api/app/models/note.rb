class Note < ApplicationRecord
  belongs_to :case

  validates :body, presence: true
end
