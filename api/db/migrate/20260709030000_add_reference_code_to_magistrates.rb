class AddReferenceCodeToMagistrates < ActiveRecord::Migration[7.1]
  def up
    add_column :magistrates, :reference_code, :string
    add_index :magistrates, :reference_code, unique: true

    execute <<~SQL.squish
      UPDATE magistrates
      SET reference_code = 'SY-' || LPAD(id::text, 4, '0')
      WHERE reference_code IS NULL
    SQL
  end

  def down
    remove_index :magistrates, :reference_code
    remove_column :magistrates, :reference_code
  end
end
