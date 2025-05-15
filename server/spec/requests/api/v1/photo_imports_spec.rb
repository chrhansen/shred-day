require 'rails_helper'


RSpec.describe "Api::V1::PhotoImports", type: :request do
  let(:user) { create(:user) }

  describe "POST /api/v1/photo_imports" do
    context "when authenticated" do
      before do
        # Log in the user
        post api_v1_session_path, params: { email: user.email, password: user.password }
        expect(response).to have_http_status(:ok)
      end

      it "returns http success" do
        post api_v1_photo_imports_path

        expect(response).to have_http_status(:success)
      end
    end
  end
end
