class HealthController < ActionController::API
  def show
    render json: { status: "ok", service: "orion-api" }
  end

  def warm
    ActiveRecord::Base.connection.execute("SELECT 1")
    head :ok
  end
end
