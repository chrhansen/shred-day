import { api } from "../lib/api";
import type {
  Account,
  Day,
  DayEntry,
  DayInput,
  Photo,
  Resort,
  SeasonStats,
  Session,
  Ski,
  Tag,
  ProviderProof,
} from "../lib/types";
const root = "/api/v1";
export const shred = {
  account: () => api.request<Account>(root + "/account"),
  days: (season: number) =>
    api.request<DayEntry[]>(root + "/days?season=" + season),
  day: (id: string) => api.request<Day>(root + "/days/" + id),
  sharedDay: (id: string) =>
    api.request<Day & { user: { username: string | null } }>(
      root + "/shared_days/" + id,
      { authenticated: false },
    ),
  saveDay: (body: DayInput, id?: string) =>
    api.request<Day>(root + "/days" + (id ? "/" + id : ""), {
      method: id ? "PATCH" : "POST",
      body: { day: body },
    }),
  deleteDay: (id: string) =>
    api.request<void>(root + "/days/" + id, { method: "DELETE" }),
  stats: (season: number) =>
    api.request<SeasonStats>(root + "/stats?season=" + season),
  resorts: (query: string, signal?: AbortSignal) =>
    api.request<Resort[]>(
      root + "/resorts?query=" + encodeURIComponent(query),
      { signal },
    ),
  recentResorts: () => api.request<Resort[]>(root + "/recent_resorts"),
  suggestResort: (name: string, country: string) =>
    api.request<Resort>(root + "/resorts", {
      method: "POST",
      body: { resort: { name, country } },
    }),
  skis: () => api.request<Ski[]>(root + "/skis"),
  tags: () => api.request<Tag[]>(root + "/tags"),
  createNamed: (kind: "skis" | "tags", name: string) =>
    api.request<Tag>(root + "/" + kind, {
      method: "POST",
      body: { [kind === "skis" ? "ski" : "tag"]: { name } },
    }),
  deleteNamed: (kind: "skis" | "tags", id: string) =>
    api.request<void>(root + "/" + kind + "/" + id, { method: "DELETE" }),
  renameSki: (id: string, name: string) =>
    api.request<Ski>(root + "/skis/" + id, {
      method: "PATCH",
      body: { ski: { name } },
    }),
  updateAccount: (body: unknown) =>
    api.request<Account>(root + "/account", {
      method: "PATCH",
      body: body instanceof FormData ? body : { user: body },
    }),
  shareDay: (id: string) =>
    api.request<Day>(root + "/shared_days", {
      method: "POST",
      body: { shared_day: { day_id: id } },
    }),
  unshareDay: (id: string) =>
    api.request<Day>(root + "/shared_days/" + id, { method: "DELETE" }),
  uploadPhoto: (body: FormData) =>
    api.request<Photo>(root + "/photos", { method: "POST", body }),
  deletePhoto: (id: string) =>
    api.request<void>(root + "/photos/" + id, { method: "DELETE" }),
  signIn: (email: string, password: string) =>
    api.request<Session>(root + "/mobile/sessions", {
      method: "POST",
      body: { email, password },
      authenticated: false,
    }),
  signUp: (email: string, password: string) =>
    api.request<Session>(root + "/mobile/users", {
      method: "POST",
      body: { user: { email, password } },
      authenticated: false,
    }),
  providerSignIn: (proof: ProviderProof, link = false) =>
    api.request<Session>(root + "/mobile/provider_sessions", {
      method: "POST",
      body: proof,
      authenticated: link,
      invalidateAuth: false,
    }),
  challenge: () =>
    api.request<{ id: string; nonce: string }>(root + "/mobile/challenges", {
      method: "POST",
      authenticated: false,
    }),
  signOut: () =>
    api.request<void>(root + "/mobile/sessions", { method: "DELETE" }),
  deleteAccount: () =>
    api.request<void>(root + "/mobile/account", {
      method: "DELETE",
      body: { confirmation: "DELETE" },
    }),
};
