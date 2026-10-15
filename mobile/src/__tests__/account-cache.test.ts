import { Directory, Paths } from "expo-file-system";
import { Image } from "expo-image";
import { clearAccountImages } from "../lib/account-cache";

const mockRemove = jest.fn();
let mockExists = true;
jest.mock("expo-file-system", () => ({
  Paths: { cache: "file:///app/Library/Caches" },
  Directory: jest.fn().mockImplementation(() => ({
    get exists() { return mockExists; }, delete: mockRemove,
  })),
}));
jest.mock("expo-image", () => ({ Image: {
  clearMemoryCache: jest.fn(), clearDiskCache: jest.fn(),
} }));
beforeEach(() => {
  jest.clearAllMocks(); mockExists = true;
  (Image.clearMemoryCache as jest.Mock).mockResolvedValue(true);
  (Image.clearDiskCache as jest.Mock).mockResolvedValue(true);
});
test("clears downloaded photos and only app-owned picker copies after deletion", async () => {
  await clearAccountImages();
  expect(Image.clearMemoryCache).toHaveBeenCalled();
  expect(Image.clearDiskCache).toHaveBeenCalled();
  expect(Directory).toHaveBeenCalledWith(Paths.cache, "ImagePicker");
  expect(mockRemove).toHaveBeenCalledTimes(1);
});
test("a cache cleanup failure remains retryable", async () => {
  mockRemove.mockImplementationOnce(() => { throw new Error("Unavailable"); });
  await expect(clearAccountImages()).rejects.toThrow("Unavailable");
  await expect(clearAccountImages()).resolves.toBeUndefined();
});
test("a missing picker cache does not block completion", async () => {
  mockExists = false;
  await clearAccountImages();
  expect(mockRemove).not.toHaveBeenCalled();
});
test("does not confirm completion when the image cache reports failure", async () => {
  (Image.clearDiskCache as jest.Mock).mockResolvedValue(false);
  await expect(clearAccountImages()).rejects.toThrow("Could not clear cached photos.");
});
