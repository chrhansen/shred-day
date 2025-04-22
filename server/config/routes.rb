Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # Render dynamic PWA files from app/views/pwa/*
  get "service-worker" => "rails/pwa#service_worker", as: :pwa_service_worker
  get "manifest" => "rails/pwa#manifest", as: :pwa_manifest

  # Defines the root path route ("/")
  # root "posts#index"

  namespace :api do
    namespace :v1 do
      resources :days, only: [:create] # Route for creating a ski day (POST /api/v1/days)
      resource :stats, only: [:show] # Route for fetching stats (GET /api/v1/stats)
      # We might add: get 'days', to: 'days#index' later

      # Authentication routes
      resources :users, only: [:create] # POST /api/v1/users (Sign Up)
      resource :session, only: [:create, :destroy] # POST /api/v1/session (Sign In), DELETE /api/v1/session (Sign Out)

      # Ski equipment routes
      resources :skis, only: [:index, :create, :update, :destroy]
    end
  end

  # Serve frontend routes - must be last
  # This ensures that any GET request not matched by the API or other routes
  # above will be served the index.html file, allowing React Router to handle it.
  get '*path', to: 'static_pages#frontend', constraints: ->(req) { !req.xhr? && req.format.html? }

  # Optional: You might want a root path specifically for the frontend too,
  # although the catch-all above should handle it if nothing else matches.
  # root 'application#frontend'
end
