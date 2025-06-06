require 'rails_helper'

RSpec.describe "Api::V1::TextImports", type: :request do
  let(:user) { create(:user) }
  let(:other_user) { create(:user) }
  let(:headers) { { 'Content-Type' => 'application/json' } }

  describe "POST /api/v1/text_imports" do
    context "when authenticated" do
      before do
        post api_v1_sessions_path, params: { email: user.email, password: user.password }
        expect(response).to have_http_status(:ok)
      end

      context "with text content" do
        let(:params) do
          {
            text: "2024-01-15 Aspen Mountain\n2024-01-16 Vail",
            season_offset: 0
          }
        end

        before do
          create(:resort, name: 'Aspen Mountain', country: 'USA')
          create(:resort, name: 'Vail', country: 'USA')
        end

        it "creates a text import and parses draft days" do
          expect {
            post "/api/v1/text_imports", params: params.to_json, headers: headers
          }.to change { TextImport.count }.by(1)
            .and change { DraftDay.count }.by(2)

          expect(response).to have_http_status(:created)
        end
      end

      context "with file upload" do
        let(:file_content) { "2024-01-15 Kühtai\n2024-01-16 Val d'Isère" }
        let(:file) { Rack::Test::UploadedFile.new(StringIO.new(file_content), "text/plain", original_filename: "ski_days.txt") }

        before do
          create(:resort, name: 'Kühtai', country: 'Austria')
          create(:resort, name: "Val d'Isère", country: 'France')
        end

        it "handles file upload with UTF-8 characters" do
          expect {
            post "/api/v1/text_imports", params: { file: file, season_offset: 0 }
          }.to change { TextImport.count }.by(1)
            .and change { DraftDay.count }.by(2)

          expect(response).to have_http_status(:created)

          text_import = TextImport.last
          expect(text_import.original_text).to include('Kühtai')
          expect(text_import.original_text).to include("Val d'Isère")
        end

        context "with invalid encoding" do
          let(:file_content) { "2024-01-15 Test\xFF Resort".force_encoding('ASCII-8BIT') }
          let(:file) { Rack::Test::UploadedFile.new(StringIO.new(file_content), "text/plain", original_filename: "bad_encoding.txt") }

          before do
            create(:resort, name: 'Test Resort', country: 'USA')
          end

          it "handles files with invalid encoding gracefully" do
            expect {
              post "/api/v1/text_imports", params: { file: file, season_offset: 0 }
            }.to change { TextImport.count }.by(1)

            expect(response).to have_http_status(:created)

            text_import = TextImport.last
            expect(text_import.original_text).to include('Test')
            expect(text_import.original_text).to include('Resort')
          end
        end
      end

      context "without content" do
        it "creates a text import in waiting status" do
          expect {
            post "/api/v1/text_imports", params: {}.to_json, headers: headers
          }.to change { TextImport.count }.by(1)

          expect(response).to have_http_status(:created)
          expect(TextImport.last.status).to eq('waiting')
        end
      end
    end

    context "when not authenticated" do
      let(:params) do
        {
          text: "2024-01-15 Aspen Mountain",
          season_offset: 0
        }
      end

      it "does not create a text import" do
        expect {
          post "/api/v1/text_imports", params: params.to_json, headers: headers
        }.to_not change { TextImport.count }
      end

      it "returns unauthorized status" do
        post "/api/v1/text_imports", params: params.to_json, headers: headers
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end

  describe "GET /api/v1/text_imports/:id" do
    let(:text_import) { create(:text_import, user: user) }
    let!(:draft_days) { create_list(:draft_day, 2, :with_text_import, text_import: text_import) }

    context "when authenticated" do
      before do
        post api_v1_sessions_path, params: { email: user.email, password: user.password }
        expect(response).to have_http_status(:ok)
      end

      it "returns the text import with draft days" do
        get "/api/v1/text_imports/#{text_import.id}", headers: headers

        expect(response).to have_http_status(:ok)
        json = JSON.parse(response.body)
        expect(json['id']).to eq(text_import.id)
        expect(json['draft_days'].length).to eq(2)
      end

      context "when text import belongs to another user" do
        let(:other_user) { create(:user) }
        let(:text_import) { create(:text_import, user: other_user) }

        it "returns not found" do
          get "/api/v1/text_imports/#{text_import.id}", headers: headers

          expect(response).to have_http_status(:not_found)
        end
      end
    end

    context "when not authenticated" do
      it "returns unauthorized status" do
        get "/api/v1/text_imports/#{text_import.id}", headers: headers
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end

  describe "PATCH /api/v1/text_imports/:id" do
    let(:text_import) { create(:text_import, user: user, status: :waiting) }
    let!(:draft_day) { create(:draft_day, :with_text_import, text_import: text_import, decision: :duplicate) }

    context "when authenticated" do
      before do
        post api_v1_sessions_path, params: { email: user.email, password: user.password }
        expect(response).to have_http_status(:ok)
      end

      context "when committing" do
        let(:params) { { text_import: { status: 'committed' } } }

        it "updates the text import status" do
          patch "/api/v1/text_imports/#{text_import.id}", params: params.to_json, headers: headers

          expect(response).to have_http_status(:ok)
          expect(text_import.reload.status).to eq('committed')
        end
      end

      context "when canceling" do
        let(:params) { { text_import: { status: 'canceled' } } }

        it "updates the text import status to canceled" do
          patch "/api/v1/text_imports/#{text_import.id}", params: params.to_json, headers: headers

          expect(response).to have_http_status(:ok)
          expect(text_import.reload.status).to eq('canceled')
        end
      end

      context "when text import is not in waiting status" do
        let(:text_import) { create(:text_import, user: user, status: :processing) }
        let(:params) { { text_import: { status: 'committed' } } }

        it "returns an error" do
          patch "/api/v1/text_imports/#{text_import.id}", params: params.to_json, headers: headers

          expect(response).to have_http_status(:unprocessable_entity)
          json = JSON.parse(response.body)
          expect(json['error']).to include('not in waiting-status')
        end
      end

      context "when text import belongs to another user" do
        let(:text_import) { create(:text_import, user: other_user, status: :waiting) }
        let(:params) { { text_import: { status: 'committed' } } }

        it "returns not found" do
          patch "/api/v1/text_imports/#{text_import.id}", params: params.to_json, headers: headers
          expect(response).to have_http_status(:not_found)
        end
      end
    end

    context "when not authenticated" do
      let(:params) { { text_import: { status: 'committed' } } }

      it "returns unauthorized status" do
        patch "/api/v1/text_imports/#{text_import.id}", params: params.to_json, headers: headers
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end

  describe "DELETE /api/v1/text_imports/:id" do
    context "when authenticated" do
      before do
        post api_v1_sessions_path, params: { email: user.email, password: user.password }
        expect(response).to have_http_status(:ok)
      end

      let!(:text_import) { create(:text_import, user: user) }

      it "deletes the text import" do
        expect {
          delete "/api/v1/text_imports/#{text_import.id}", headers: headers
        }.to change { TextImport.count }.by(-1)

        expect(response).to have_http_status(:no_content)
      end

      context "when text import belongs to another user" do
        let!(:text_import) { create(:text_import, user: other_user) }

        it "returns not found" do
          expect {
            delete "/api/v1/text_imports/#{text_import.id}", headers: headers
          }.to_not change { TextImport.count }

          expect(response).to have_http_status(:not_found)
        end
      end
    end

    context "when not authenticated" do
      let!(:text_import) { create(:text_import, user: user) }

      it "does not delete the text import" do
        expect {
          delete "/api/v1/text_imports/#{text_import.id}", headers: headers
        }.to_not change { TextImport.count }
      end

      it "returns unauthorized status" do
        delete "/api/v1/text_imports/#{text_import.id}", headers: headers
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end
end