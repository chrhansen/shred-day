import { apiClient } from "@/lib/apiClient";
import type { Tag } from "@/types/ski";

export const tagService = {
  async getTags(): Promise<Tag[]> {
    return apiClient.get<Tag[]>("/api/v1/tags");
  },

  async createTag(payload: { name: string }): Promise<Tag> {
    return apiClient.post<Tag>("/api/v1/tags", { tag: payload });
  },

  async deleteTag(tagId: string): Promise<void> {
    await apiClient.delete(`/api/v1/tags/${tagId}`);
  },
};
