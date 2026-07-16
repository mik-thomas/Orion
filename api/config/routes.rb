Rails.application.routes.draw do
  get "health", to: "health#show"
  get "warm", to: "health#warm"
  get "up" => "rails/health#show", as: :rails_health_check

  namespace :api do
    namespace :v1 do
      get "status", to: "status#show"
      resource :session, only: %i[create show destroy]
      get "reports/overview", to: "reports#overview"

      resources :magistrates do
        collection do
          get :on_leave
          get :retiring_soon
          get :roster
        end
        resources :leaves_of_absence, only: %i[index create update destroy]
        resources :cases, only: %i[index create]
      end

      resources :cases, only: %i[show update destroy] do
        resources :notes, only: %i[index create destroy]
      end

      resources :courthouses, only: %i[index]
      resources :sitting_types, only: %i[index]
      resources :sittings, only: %i[index] do
        collection do
          get :drill_down
        end
      end

      resources :tasks do
        collection do
          get :summary
        end
      end
    end
  end
end
