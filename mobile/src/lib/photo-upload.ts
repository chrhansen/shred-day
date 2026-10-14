import type { ImagePickerAsset } from "expo-image-picker";
import { File } from "expo-file-system";
export function photoForm(asset: ImagePickerAsset, field = "file") {
  const form = new FormData();
  form.append(field, asset.file || new File(asset.uri));
  return form;
}
