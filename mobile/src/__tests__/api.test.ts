import { api, ApiClient, ApiError, errorMessage } from "../lib/api";
import { shred } from "../services/shred";
import { photoForm } from "../lib/photo-upload";
const fetchMock = jest.fn();
global.fetch = fetchMock;
function response(status = 200, payload: unknown = {}) {
  return { ok: status < 400, status, json: async () => payload };
}
beforeEach(() => {
  fetchMock.mockReset();
  api.token = null;
  api.onUnauthorized = undefined;
});

test("private requests use bearer auth and public shared days omit it", async () => {
  api.token = "device-token";
  fetchMock.mockResolvedValue(response());
  await shred.day("day_1");
  expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe(
    "Bearer device-token",
  );
  await shred.sharedDay("day_1");
  expect(fetchMock.mock.calls[1][1].headers.Authorization).toBeUndefined();
});
test("revoked sessions invalidate auth, while failed provider linking keeps it", async () => {
  api.token = "device-token";
  api.onUnauthorized = jest.fn();
  fetchMock.mockResolvedValue(response(401, { error: "Please sign in" }));
  await expect(
    shred.providerSignIn(
      { provider: "apple", identity_token: "invalid" },
      true,
    ),
  ).rejects.toThrow(ApiError);
  expect(api.onUnauthorized).not.toHaveBeenCalled();
  await expect(shred.account()).rejects.toThrow("Please sign in");
  expect(api.onUnauthorized).toHaveBeenCalledTimes(1);
});
test("a late 401 from the old session cannot clear the replacement session", async () => {
  const client = new ApiClient("https://shred.day/");
  client.token = "old";
  client.onUnauthorized = jest.fn();
  let finish!: (value: unknown) => void;
  fetchMock.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const pending = client.request("/api/v1/account");
  client.token = "new";
  finish(response(401));
  await expect(pending).rejects.toThrow(ApiError);
  expect(client.onUnauthorized).not.toHaveBeenCalled();
});
test("multipart photos use the Rails file field and leave the boundary to fetch", async () => {
  const form = photoForm({
    uri: "file:///IMG.HEIC",
    width: 10,
    height: 10,
    fileName: "IMG.HEIC",
    mimeType: "image/heic",
  });
  api.token = "device-token";
  fetchMock.mockResolvedValue(response(201));
  await shred.uploadPhoto(form);
  const request = fetchMock.mock.calls[0][1];
  expect(request.body).toBe(form);
  expect(request.headers["Content-Type"]).toBeUndefined();
  expect(form.has("file")).toBe(true);
});
test("day edits send explicit empty photos so the last attachment can be removed", async () => {
  fetchMock.mockResolvedValue(response());
  await shred.saveDay(
    {
      date: "2026-02-01",
      resort_id: "res_1",
      ski_ids: [],
      tag_ids: [],
      photo_ids: [],
      notes: null,
    },
    "day_1",
  );
  expect(JSON.parse(fetchMock.mock.calls[0][1].body).day.photo_ids).toEqual([]);
});
test("no-content responses do not require JSON and network failures explain retry", async () => {
  const client = new ApiClient();
  fetchMock.mockResolvedValue(response(204));
  await expect(
    client.request("/api/v1/mobile/sessions", { method: "DELETE" }),
  ).resolves.toBeUndefined();
  fetchMock.mockRejectedValue(new Error("Native socket failure"));
  await expect(client.request("/api/v1/account")).rejects.toThrow(
    "Check your connection",
  );
});
test("Rails field and array validation errors remain readable", () => {
  expect(
    errorMessage(
      { errors: { date: ["is invalid"], base: ["Too many days"] } },
      "Fallback",
    ),
  ).toBe("date is invalid. Too many days");
  expect(errorMessage({ errors: ["No file provided."] }, "Fallback")).toBe(
    "No file provided.",
  );
});
