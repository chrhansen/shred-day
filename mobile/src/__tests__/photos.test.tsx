import { act, renderHook, waitFor } from "@testing-library/react-native";
import * as ImagePicker from "expo-image-picker";
import { useDayPhotos } from "../hooks/use-day-photos";
import { shred } from "../services/shred";
jest.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  UIImagePickerPreferredAssetRepresentationMode: { Current: "current" },
}));
jest.mock("../services/shred", () => ({
  shred: { uploadPhoto: jest.fn(), deletePhoto: jest.fn() },
}));
const asset = { uri: "file:///ski.jpg", width: 100, height: 100 };
const photo = {
  id: "photo_1",
  preview_url: null,
  full_url: null,
  filename: "ski.jpg",
};
beforeEach(() => {
  jest.resetAllMocks();
  (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
    canceled: false,
    assets: [asset],
  });
  (shred.deletePhoto as jest.Mock).mockResolvedValue(undefined);
});
test("failed photos keep saving blocked until retried or removed", async () => {
  (shred.uploadPhoto as jest.Mock)
    .mockRejectedValueOnce(new Error("Connection lost"))
    .mockResolvedValueOnce(photo);
  const { result } = renderHook(useDayPhotos);
  await act(async () => {
    await result.current.pick(false);
  });
  expect(result.current.pending).toBe(true);
  expect(result.current.photos[0].status).toBe("failed");
  await act(async () => {
    await result.current.retry(result.current.photos[0]);
  });
  expect(result.current.pending).toBe(false);
  expect(result.current.photos[0].id).toBe(photo.id);
});
test("canceling an editor cleans up newly uploaded photos and keeps original attachments", async () => {
  (shred.uploadPhoto as jest.Mock).mockResolvedValue(photo);
  const { result, unmount } = renderHook(useDayPhotos);
  await act(async () => {
    result.current.load([{ ...photo, id: "original" }]);
    await result.current.pick(false);
  });
  unmount();
  expect(shred.deletePhoto).toHaveBeenCalledWith(photo.id);
  expect(shred.deletePhoto).not.toHaveBeenCalledWith("original");
});
test("saved photos survive editor unmount", async () => {
  (shred.uploadPhoto as jest.Mock).mockResolvedValue(photo);
  const { result, unmount } = renderHook(useDayPhotos);
  await act(async () => {
    await result.current.pick(false);
  });
  act(() => result.current.commit());
  unmount();
  expect(shred.deletePhoto).not.toHaveBeenCalled();
});
test("a late upload is removed if its editor was closed while uploading", async () => {
  let finish!: (value: unknown) => void;
  (shred.uploadPhoto as jest.Mock).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const { result, unmount } = renderHook(useDayPhotos);
  let pending!: Promise<void>;
  act(() => {
    pending = result.current.pick(false);
  });
  await waitFor(() => expect(shred.uploadPhoto).toHaveBeenCalled());
  unmount();
  await act(async () => {
    finish(photo);
    await pending;
  });
  expect(shred.deletePhoto).toHaveBeenCalledWith(photo.id);
});
test("denied camera permission explains the next step without opening the camera", async () => {
  (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({
    granted: false,
  });
  const { result } = renderHook(useDayPhotos);
  await act(async () => {
    await result.current.pick(true);
  });
  expect((result.current.error as Error).message).toContain("iPhone Settings");
  expect(ImagePicker.launchCameraAsync).not.toHaveBeenCalled();
});
test("a second library tap cannot open another picker while selection is pending", async () => {
  let finish!: (value: unknown) => void;
  (ImagePicker.launchImageLibraryAsync as jest.Mock).mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  const { result } = renderHook(useDayPhotos);
  let pending!: Promise<void>;
  act(() => { pending = result.current.pick(false); });
  await act(async () => { await result.current.pick(false); });
  expect(result.current.pending).toBe(true);
  expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledTimes(1);
  await act(async () => { finish({ canceled: true }); await pending; });
  expect(result.current.pending).toBe(false);
});
test("duplicate retry taps cannot upload the same failed photo twice", async () => {
  let finish!: (value: unknown) => void;
  (shred.uploadPhoto as jest.Mock).mockRejectedValueOnce(new Error("Connection lost"));
  const { result } = renderHook(useDayPhotos);
  await act(async () => { await result.current.pick(false); });
  (shred.uploadPhoto as jest.Mock).mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  let pending!: Promise<void>;
  act(() => { pending = result.current.retry(result.current.photos[0]); });
  await act(async () => { await result.current.retry(result.current.photos[0]); });
  expect(shred.uploadPhoto).toHaveBeenCalledTimes(2);
  await act(async () => { finish(photo); await pending; });
  expect(result.current.photos).toHaveLength(1);
  expect(result.current.pending).toBe(false);
});
test("initial edit attachments are ready immediately and removing them does not delete the saved originals", () => {
  const original = { ...photo, id: "original" };
  const { result, unmount } = renderHook(() => useDayPhotos([original]));
  expect(result.current.photos[0].id).toBe("original");
  expect(result.current.pending).toBe(false);
  act(() => result.current.remove(result.current.photos[0]));
  unmount();
  expect(shred.deletePhoto).not.toHaveBeenCalled();
});
