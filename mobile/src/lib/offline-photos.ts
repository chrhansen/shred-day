import { Directory, File, Paths } from "expo-file-system";
import { randomUUID } from "expo-crypto";
import type { ImagePickerAsset } from "expo-image-picker";
import type { Photo } from "./types";

const prefix = "local_photo_";
export const isLocalPhoto = (id: string) => id.startsWith(prefix);
export function relativePhotoUri(uri: string) {
  const marker = uri.indexOf("/journal/");
  return uri.startsWith("file:") && marker !== -1 ? uri.slice(marker + 1) : uri;
}
export function resolvePhotoUri(uri: string) {
  const relative = relativePhotoUri(uri);
  return relative.startsWith("journal/") ? new File(Paths.document, relative).uri : uri;
}
export async function stagePhoto(asset: ImagePickerAsset, owner: string): Promise<Photo> {
  const id = prefix + randomUUID();
  const directory = new Directory(Paths.document, "journal", owner);
  directory.create({ intermediates: true, idempotent: true });
  const extension = asset.uri.split("?")[0].match(/\.(\w{1,8})$/)?.[0] || ".jpg";
  const destination = new File(directory, id + extension);
  new File(asset.uri).copy(destination);
  return { id, filename: destination.name, preview_url: destination.uri, full_url: destination.uri };
}
export function discardLocalPhoto(uri: string | null) {
  if (uri) uri = resolvePhotoUri(uri);
  if (!uri || !uri.startsWith(new Directory(Paths.document, "journal").uri)) return;
  const file = new File(uri);
  if (file.exists) file.delete();
}
export function purgeLocalPhotos(owner: string) {
  const directory = new Directory(Paths.document, "journal", owner);
  if (directory.exists) directory.delete();
}
