# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[7.1].define(version: 2026_07_16_210000) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "plpgsql"

  create_table "cases", force: :cascade do |t|
    t.bigint "magistrate_id", null: false
    t.string "reference"
    t.string "title", null: false
    t.string "status", default: "open", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["magistrate_id"], name: "index_cases_on_magistrate_id"
  end

  create_table "courthouses", force: :cascade do |t|
    t.string "name", null: false
    t.string "borough"
    t.string "code"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "cluster", default: "North West", null: false
    t.string "bench", default: "South Yorkshire", null: false
    t.index ["name"], name: "index_courthouses_on_name", unique: true
  end

  create_table "leaves_of_absence", force: :cascade do |t|
    t.bigint "magistrate_id", null: false
    t.date "starts_on", null: false
    t.date "ends_on"
    t.string "reason"
    t.text "notes"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.date "next_review_on"
    t.index ["magistrate_id"], name: "index_leaves_of_absence_on_magistrate_id"
  end

  create_table "magistrate_sitting_locations", force: :cascade do |t|
    t.bigint "magistrate_id", null: false
    t.bigint "courthouse_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["courthouse_id"], name: "index_magistrate_sitting_locations_on_courthouse_id"
    t.index ["magistrate_id", "courthouse_id"], name: "index_magistrate_sitting_locations_unique", unique: true
    t.index ["magistrate_id"], name: "index_magistrate_sitting_locations_on_magistrate_id"
  end

  create_table "magistrates", force: :cascade do |t|
    t.string "first_name", null: false
    t.string "last_name", null: false
    t.string "email"
    t.date "date_of_appointment"
    t.bigint "home_courthouse_id"
    t.text "reasonable_adjustments"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "title"
    t.string "middle_name"
    t.string "frequency"
    t.string "sitting_pattern"
    t.date "leaving_date"
    t.string "leaving_reason"
    t.string "bench"
    t.boolean "active", default: true, null: false
    t.string "cluster", default: "North West", null: false
    t.string "bench_role"
    t.string "appraisal_status"
    t.integer "appraisal_cycle_years"
    t.boolean "presiding_justice", default: false, null: false
    t.date "last_appraisal_on"
    t.string "last_appraiser"
    t.date "last_login_on"
    t.integer "days_since_login"
    t.string "reference_code"
    t.date "retirement_on"
    t.index ["email"], name: "index_magistrates_on_email"
    t.index ["home_courthouse_id"], name: "index_magistrates_on_home_courthouse_id"
    t.index ["last_name", "first_name"], name: "index_magistrates_on_last_name_and_first_name"
    t.index ["reference_code"], name: "index_magistrates_on_reference_code", unique: true
    t.index ["retirement_on"], name: "index_magistrates_on_retirement_on"
  end

  create_table "notes", force: :cascade do |t|
    t.bigint "case_id", null: false
    t.text "body", null: false
    t.string "author_name"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["case_id"], name: "index_notes_on_case_id"
  end

  create_table "sitting_types", force: :cascade do |t|
    t.string "name", null: false
    t.string "code"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["name"], name: "index_sitting_types_on_name", unique: true
  end

  create_table "sittings", force: :cascade do |t|
    t.bigint "magistrate_id", null: false
    t.bigint "courthouse_id", null: false
    t.bigint "sitting_type_id", null: false
    t.date "session_date", null: false
    t.time "starts_at"
    t.time "ends_at"
    t.boolean "vacated", default: false, null: false
    t.text "vacated_reason"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "status", default: "completed", null: false
    t.string "session"
    t.string "venue_name"
    t.string "position"
    t.string "panel"
    t.string "business_type"
    t.string "justice_area"
    t.boolean "ad_hoc", default: false, null: false
    t.datetime "event_at"
    t.integer "notice_days"
    t.text "action_reason"
    t.string "action_by"
    t.string "import_source"
    t.string "import_key"
    t.string "court_type"
    t.string "sitting_position"
    t.string "court_room"
    t.string "cancellation_category"
    t.index "magistrate_id, session_date, COALESCE(session, ''::character varying), courthouse_id", name: "index_sittings_on_unique_event", unique: true
    t.index ["business_type"], name: "index_sittings_on_business_type"
    t.index ["court_type"], name: "index_sittings_on_court_type"
    t.index ["courthouse_id", "session_date"], name: "index_sittings_on_courthouse_id_and_session_date"
    t.index ["courthouse_id"], name: "index_sittings_on_courthouse_id"
    t.index ["import_key"], name: "index_sittings_on_import_key", unique: true
    t.index ["magistrate_id", "session_date"], name: "index_sittings_on_magistrate_id_and_session_date"
    t.index ["magistrate_id"], name: "index_sittings_on_magistrate_id"
    t.index ["sitting_position"], name: "index_sittings_on_sitting_position"
    t.index ["sitting_type_id"], name: "index_sittings_on_sitting_type_id"
    t.index ["status"], name: "index_sittings_on_status"
    t.index ["vacated"], name: "index_sittings_on_vacated"
  end

  create_table "training_records", force: :cascade do |t|
    t.bigint "magistrate_id", null: false
    t.date "session_date", null: false
    t.decimal "days", precision: 3, scale: 1, default: "1.0", null: false
    t.string "description"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["magistrate_id", "session_date"], name: "index_training_records_on_magistrate_id_and_session_date"
    t.index ["magistrate_id"], name: "index_training_records_on_magistrate_id"
  end

  create_table "user_sessions", force: :cascade do |t|
    t.bigint "user_id", null: false
    t.string "token_digest", null: false
    t.datetime "expires_at", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["expires_at"], name: "index_user_sessions_on_expires_at"
    t.index ["token_digest"], name: "index_user_sessions_on_token_digest", unique: true
    t.index ["user_id"], name: "index_user_sessions_on_user_id"
  end

  create_table "users", force: :cascade do |t|
    t.string "username", null: false
    t.string "email"
    t.string "password_digest", null: false
    t.string "role", default: "deputy", null: false
    t.string "display_name", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_users_on_email", unique: true, where: "(email IS NOT NULL)"
    t.index ["username"], name: "index_users_on_username", unique: true
  end

  add_foreign_key "cases", "magistrates"
  add_foreign_key "leaves_of_absence", "magistrates"
  add_foreign_key "magistrate_sitting_locations", "courthouses"
  add_foreign_key "magistrate_sitting_locations", "magistrates"
  add_foreign_key "magistrates", "courthouses", column: "home_courthouse_id"
  add_foreign_key "notes", "cases"
  add_foreign_key "sittings", "courthouses"
  add_foreign_key "sittings", "magistrates"
  add_foreign_key "sittings", "sitting_types"
  add_foreign_key "training_records", "magistrates"
  add_foreign_key "user_sessions", "users"
end
