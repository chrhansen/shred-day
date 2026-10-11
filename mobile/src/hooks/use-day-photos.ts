import { useEffect, useRef, useState } from "react";
import { Linking } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { shred } from "../services/shred";
import { photoForm } from "../lib/photo-upload";
import type { Photo } from "../lib/types";
export type EditorPhoto = {
  key: string;
  id?: string;
  uri: string | null;
  asset?: ImagePicker.ImagePickerAsset;
  status: "ready" | "uploading" | "failed";
  error?: string;
};
export function useDayPhotos() {
  const [photos, setPhotos] = useState<EditorPhoto[]>([]);
  const [error, setError] = useState<unknown>(null);
  const alive = useRef(true);
  const created = useRef(new Set<string>());
  const removed = useRef(new Set<string>());
  const committed = useRef(false);
  useEffect(() => {
    const uploads = created.current;
    alive.current = true;
    return () => {
      alive.current = false;
      if (!committed.current)
        uploads.forEach((id) => {
          void shred.deletePhoto(id).catch(() => {});
        });
    };
  }, []);
  const upload = async (item: EditorPhoto) => {
    if (!item.asset) return;
    setPhotos((current) =>
      current.map((p) =>
        p.key === item.key
          ? { ...p, status: "uploading", error: undefined }
          : p,
      ),
    );
    try {
      const photo = await shred.uploadPhoto(photoForm(item.asset));
      if (!alive.current || removed.current.has(item.key)) {
        await shred.deletePhoto(photo.id);
        return;
      }
      created.current.add(photo.id);
      setPhotos((current) =>
        current.map((p) =>
          p.key === item.key ? { ...p, id: photo.id, status: "ready" } : p,
        ),
      );
    } catch (cause) {
      if (alive.current)
        setPhotos((current) =>
          current.map((p) =>
            p.key === item.key
              ? { ...p, status: "failed", error: (cause as Error).message }
              : p,
          ),
        );
    }
  };
  const pick = async (camera: boolean) => {
    setError(null);
    try {
      if (camera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          throw new Error(
            "Camera access is disabled. Enable it in iPhone Settings to take a photo.",
          );
        }
      }
      const result = camera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ["images"],
            quality: 1,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsMultipleSelection: true,
            quality: 1,
            preferredAssetRepresentationMode:
              ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Current,
          });
      if (result.canceled || !alive.current) return;
      const selected: EditorPhoto[] = result.assets.map((asset, i) => ({
        key: Date.now() + ":" + i + ":" + asset.uri,
        uri: asset.uri,
        asset,
        status: "uploading",
      }));
      setPhotos((current) => [...current, ...selected]);
      for (const photo of selected) await upload(photo);
    } catch (cause) {
      setError(cause);
    }
  };
  const remove = (photo: EditorPhoto) => {
    removed.current.add(photo.key);
    setPhotos((current) => current.filter((p) => p.key !== photo.key));
    if (photo.id && created.current.delete(photo.id))
      void shred.deletePhoto(photo.id).catch((cause) => setError(cause));
  };
  const load = (initial: Photo[]) =>
    setPhotos(
      initial.map((p) => ({
        key: p.id,
        id: p.id,
        uri: p.preview_url || p.full_url,
        status: "ready",
      })),
    );
  return {
    photos,
    error,
    pick,
    remove,
    retry: upload,
    load,
    commit: () => {
      committed.current = true;
    },
    openSettings: () => Linking.openSettings(),
    pending: photos.some((p) => p.status !== "ready"),
  };
}
