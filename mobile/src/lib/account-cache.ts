import { Directory, Paths } from "expo-file-system";
import { Image } from "expo-image";

export async function clearAccountImages() {
  const memoryCleared = await Image.clearMemoryCache();
  const diskCleared = await Image.clearDiskCache();
  if (!memoryCleared || !diskCleared) throw new Error("Could not clear cached photos.");
  const pickerCache = new Directory(Paths.cache, "ImagePicker");
  if (pickerCache.exists) pickerCache.delete();
}
