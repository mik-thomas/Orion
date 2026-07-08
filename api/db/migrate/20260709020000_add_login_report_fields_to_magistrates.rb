class AddLoginReportFieldsToMagistrates < ActiveRecord::Migration[7.1]
  def change
    change_table :magistrates, bulk: true do |t|
      t.date :last_login_on
      t.integer :days_since_login
    end
  end
end
