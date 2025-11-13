import { apiClient } from "@/lib/apiClient";
import type { Label } from "@/types/ski";

export const tagService = {
  async getTags(): Promise<Label[]> {
    return apiClient.get<Label[]>("/api/v1/tags");
  },

  async createTag(payload: { name: string }): Promise<Label> {
    return apiClient.post<Label>("/api/v1/tags", { tag: payload });
  },

  async deleteTag(tagId: string): Promise<void> {
    await apiClient.delete(`/api/v1/tags/${tagId}`);
  },
};
