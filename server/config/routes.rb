Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # Render dynamic PWA files from app/views/pwa/*
  get "service-worker" => "rails/pwa#service_worker", as: :pwa_service_worker
  get "manifest" => "rails/pwa#manifest", as: :pwa_manifest

  namespace :api do
    namespace :v1 do
      resources :photos, only: [:create, :destroy]
      resources :photo_imports, only: [:create, :show, :update, :destroy] do
        resources :photos, only: [:create, :destroy, :update], module: :photo_imports
      end
      resources :text_imports, only: [:create, :show, :update, :destroy]
      resources :draft_days, only: [:update]

      resources :days, only: [:create, :index, :show, :update, :destroy] do
        patch :share, on: :member
      end
      resources :shared_days, only: [:show]
      resource :stats, only: [:show]
      resource :account, only: [:show, :update], controller: :account

      # Authentication routes
      resources :users, only: [:create] # Sign Up
      resource :sessions, only: [:create, :destroy] # Sign In, Sign Out
      resource :google_sign_in_flow, only: [:update, :create], controller: :google_sign_in_flow

      resources :skis, only: [:index, :create, :update, :destroy]
      resources :tags, only: [:index, :create, :destroy]
      resources :resorts, only: [:index] # GET /api/v1/resorts?query=... (Search Resorts)
      resources :recent_resorts, only: [:index] # GET /api/v1/recent_resorts

      resource :csv_export, only: [:show, :create], controller: :csv_export
      resource :google_sheet_integration, only: [:show, :create, :update, :destroy], controller: :google_sheet_integrations
    end
  end

  mount MissionControl::Jobs::Engine, at: "/admin/jobs"

  # Share page (must be above the catch-all)
  get "/d/:id", to: "shared_days#show", as: :shared_day, constraints: ->(req) { req.format.html? }

  # Serve frontend routes - must be last
  # This ensures that any GET request not matched by the API or other routes
  # above will be served the index.html file, allowing React Router to handle it.
  get '*path', to: 'static_pages#frontend', constraints: ->(req) { !req.xhr? && req.format.html? }

  # Optional: You might want a root path specifically for the frontend too,
  # although the catch-all above should handle it if nothing else matches.
  # root 'application#frontend'
end
