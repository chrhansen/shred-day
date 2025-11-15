require 'rails_helper'

RSpec.describe "Api::V1::Tags", type: :request do
  let!(:user) { create(:user) }
  let!(:resort) { create(:resort) }
  let!(:tag_one) { create(:tag, user: user, name: "With Friends") }
  let!(:tag_two) { create(:tag, user: user, name: "Training") }

  before do
    post api_v1_sessions_path, params: { email: user.email, password: user.password }
    expect(response).to have_http_status(:ok)
  end

  describe "GET /api/v1/tags" do
    it "returns the user's tags ordered alphabetically" do
      get api_v1_tags_path

      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json.size).to eq(2)
      expect(json.first["name"]).to eq("Training") # Alphabetical order
      expect(json.last["name"]).to eq("With Friends")
    end
  end

  describe "POST /api/v1/tags" do
    it "creates a new tag" do
      post api_v1_tags_path, params: { tag: { name: "Powder Day" } }

      expect(response).to have_http_status(:created)
      json = JSON.parse(response.body)
      expect(json["name"]).to eq("Powder Day")
      expect(user.tags.exists?(name: "Powder Day")).to be_truthy
    end

    it "returns errors when the tag is invalid" do
      post api_v1_tags_path, params: { tag: { name: "" } }

      expect(response).to have_http_status(:unprocessable_entity)
      json = JSON.parse(response.body)
      expect(json["errors"]).to include("Name can't be blank")
    end
  end

  describe "DELETE /api/v1/tags/:id" do
    it "removes an unused tag" do
      delete api_v1_tag_path(tag_two)

      expect(response).to have_http_status(:no_content)
      expect(user.tags.exists?(tag_two.id)).to be_falsey
    end

    it "prevents deletion if the tag is attached to a day" do
      day = create(:day, :with_tags, user: user, resort: resort, tag_names: [tag_one.name])

      expect {
        delete api_v1_tag_path(tag_one)
      }.not_to change(Tag, :count)

      expect(response).to have_http_status(:unprocessable_entity)
      json = JSON.parse(response.body)
      expect(json["errors"].first).to match(/cannot delete/i)
      expect(day.reload.tags.map(&:id)).to include(tag_one.id)
    end
  end
end
