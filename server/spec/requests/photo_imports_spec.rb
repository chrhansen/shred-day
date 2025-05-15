require 'rails_helper'

RSpec.describe "PhotoImports", type: :request do
  describe "GET /create" do
    it "returns http success" do
      get "/photo_imports/create"
      expect(response).to have_http_status(:success)
    end
  end

end
