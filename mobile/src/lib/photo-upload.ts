import type { ImagePickerAsset } from "expo-image-picker";
export function photoForm(asset: ImagePickerAsset, field = "file") {
  const form = new FormData();
  const type =
    asset.mimeType ||
    (asset.uri.toLowerCase().endsWith(".heic") ? "image/heic" : "image/jpeg");
  const name =
    asset.fileName || "photo." + (type === "image/heic" ? "heic" : "jpg");
  form.append(field, { uri: asset.uri, name, type } as unknown as Blob);
  return form;
}
