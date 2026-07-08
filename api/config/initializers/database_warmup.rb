if Rails.env.production?
  Rails.application.config.after_initialize do
    ActiveRecord::Base.connection.execute("SELECT 1")
  rescue StandardError => e
    Rails.logger.warn("database warmup failed: #{e.message}")
  end
end
