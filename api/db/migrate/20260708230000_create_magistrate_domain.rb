class CreateMagistrateDomain < ActiveRecord::Migration[7.1]
  def change
    drop_table :items, if_exists: true

    create_table :courthouses do |t|
      t.string :name, null: false
      t.string :borough
      t.string :code
      t.timestamps
    end
    add_index :courthouses, :name, unique: true

    create_table :sitting_types do |t|
      t.string :name, null: false
      t.string :code
      t.timestamps
    end
    add_index :sitting_types, :name, unique: true

    create_table :magistrates do |t|
      t.string :first_name, null: false
      t.string :last_name, null: false
      t.string :email
      t.date :date_of_appointment
      t.references :home_courthouse, foreign_key: { to_table: :courthouses }
      t.text :reasonable_adjustments
      t.timestamps
    end
    add_index :magistrates, %i[last_name first_name]

    create_table :magistrate_sitting_locations do |t|
      t.references :magistrate, null: false, foreign_key: true
      t.references :courthouse, null: false, foreign_key: true
      t.timestamps
    end
    add_index :magistrate_sitting_locations, %i[magistrate_id courthouse_id], unique: true,
      name: "index_magistrate_sitting_locations_unique"

    create_table :leaves_of_absence do |t|
      t.references :magistrate, null: false, foreign_key: true
      t.date :starts_on, null: false
      t.date :ends_on
      t.string :reason
      t.text :notes
      t.timestamps
    end

    create_table :cases do |t|
      t.references :magistrate, null: false, foreign_key: true
      t.string :reference
      t.string :title, null: false
      t.string :status, null: false, default: "open"
      t.timestamps
    end

    create_table :notes do |t|
      t.references :case, null: false, foreign_key: true
      t.text :body, null: false
      t.string :author_name
      t.timestamps
    end

    create_table :sittings do |t|
      t.references :magistrate, null: false, foreign_key: true
      t.references :courthouse, null: false, foreign_key: true
      t.references :sitting_type, null: false, foreign_key: true
      t.date :session_date, null: false
      t.time :starts_at
      t.time :ends_at
      t.boolean :vacated, null: false, default: false
      t.text :vacated_reason
      t.timestamps
    end
    add_index :sittings, %i[magistrate_id session_date]
    add_index :sittings, %i[courthouse_id session_date]
    add_index :sittings, :vacated
  end
end
