import { useState } from "react";
import { ActionSheetIOS, ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { PhotoAccessError, type EditorPhoto, type useDayPhotos } from "../../hooks/use-day-photos";
import { colors } from "../../theme";
import { Button, Icon, Text } from "../ui";

export function EditorPhotos({ state, disabled = false }: { state: ReturnType<typeof useDayPhotos>; disabled?: boolean }) {
  const uploading = state.photos.filter((photo) => photo.status === "uploading").length;
  const failed = state.photos.filter((photo) => photo.status === "failed").length;
  const selectSource = () => {
    if (disabled || state.picking) return;
    if (Platform.OS === "ios") ActionSheetIOS.showActionSheetWithOptions({
      options: ["Cancel", "Take Photo", "Choose from Library"], cancelButtonIndex: 0,
    }, (index) => { if (index === 1 || index === 2) void state.pick(index === 1); });
    else Alert.alert("Add photo", undefined, [
      { text: "Take Photo", onPress: () => void state.pick(true) },
      { text: "Choose from Library", onPress: () => void state.pick(false) },
      { text: "Cancel", style: "cancel" },
    ]);
  };
  const access = state.error instanceof PhotoAccessError ? state.error.source : null;
  return <View style={{ gap: 14 }}>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled"
      style={{ marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 4, gap: 10 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Add photos" disabled={disabled || state.picking}
        accessibilityState={{ disabled: disabled || state.picking }} onPress={selectSource} style={[photoStyles.tile, photoStyles.add]}>
        <Icon name="images" size={24} color={colors.text600} /><Text variant="label" style={{ color: colors.text600 }}>Add</Text>
      </Pressable>
      {state.photos.map((photo, index) => <PhotoTile key={photo.key} photo={photo} index={index} disabled={disabled}
        onRemove={() => state.remove(photo)} onRetry={() => void state.retry(photo)} />)}
    </ScrollView>
    {Boolean(uploading) && <PhotoNotice>{uploading} {uploading === 1 ? "photo uploading" : "photos uploading"}. You can save when {uploading === 1 ? "it's" : "they're"} done.</PhotoNotice>}
    {Boolean(failed) && <PhotoNotice error>{failed} {failed === 1 ? "photo didn't" : "photos didn't"} upload. Retry or remove {failed === 1 ? "it" : "them"} to save.</PhotoNotice>}
    {Boolean(state.error) && <View style={[photoStyles.notice, photoStyles.errorNotice]}>
      <Text variant="headline" style={{ color: colors.errorText }}>{access ? `${access === "camera" ? "Camera" : "Photo"} access is off` : "Couldn't add photos"}</Text>
      <Text variant="footnote" style={{ color: colors.errorText }}>{access
        ? `Allow Shred.Day to use your ${access === "camera" ? "camera" : "photos"} in iOS Settings, then come back to add them.`
        : "Please try again. Your existing photos are still here."}</Text>
      {access ? <Button variant="compact" title="Open Settings" onPress={() => void state.openSettings()} />
        : <Button variant="compact" title="Try Again" onPress={selectSource} />}
    </View>}
  </View>;
}
function PhotoTile({ photo, index, disabled, onRemove, onRetry }: {
  photo: EditorPhoto; index: number; disabled: boolean; onRemove: () => void; onRetry: () => void;
}) {
  const [unavailable, setUnavailable] = useState(false);
  return <View style={photoStyles.tile}>
    {photo.uri && !unavailable ? <Image source={photo.uri} contentFit="cover" style={StyleSheet.absoluteFill}
      accessibilityLabel={`Selected photo ${index + 1}`} onError={() => setUnavailable(true)} />
      : <Icon name="image-off" color={colors.textSecondary} size={24} />}
    {photo.status === "uploading" && <View style={[StyleSheet.absoluteFill, photoStyles.overlay, { backgroundColor: colors.uploadOverlay }]}>
      <ActivityIndicator color={colors.indigo} accessibilityLabel="Uploading photo" /><Text variant="small">Uploading</Text>
    </View>}
    {photo.status === "failed" && <View style={[StyleSheet.absoluteFill, photoStyles.overlay, { backgroundColor: colors.failedOverlay }]}>
      <Icon name="alert" color={colors.canvas} />
      <Pressable onPress={onRetry} disabled={disabled} accessibilityRole="button" accessibilityLabel={`Retry photo ${index + 1}`}
        style={{ minHeight: 44, minWidth: 58, alignItems: "center", justifyContent: "center" }}>
        <View style={photoStyles.retry}><Icon name="refresh" size={13} color={colors.errorText} /><Text variant="small" style={{ color: colors.errorText }}>Retry</Text></View>
      </Pressable>
    </View>}
    <Pressable accessibilityRole="button" accessibilityLabel={`Remove photo ${index + 1}`} disabled={disabled}
      accessibilityState={{ disabled }} onPress={onRemove} style={photoStyles.remove}>
      <View style={photoStyles.removeIcon}><Icon name="x" size={14} strokeWidth={2.5} color={colors.canvas} /></View>
    </Pressable>
  </View>;
}
function PhotoNotice({ children, error = false }: { children: React.ReactNode; error?: boolean }) {
  return <View accessibilityLiveRegion="polite" style={[photoStyles.notice, error && photoStyles.errorNotice, { flexDirection: "row", alignItems: "center" }]}>
    <Icon name={error ? "alert" : "info"} size={18} color={error ? colors.errorText : colors.infoText} />
    <Text variant="footnote" style={{ flex: 1, color: error ? colors.errorText : colors.infoText }}>{children}</Text>
  </View>;
}
const photoStyles = StyleSheet.create({
  tile: { width: 96, height: 96, borderRadius: 12, overflow: "hidden", backgroundColor: colors.fill, alignItems: "center", justifyContent: "center" },
  add: { borderWidth: 1.5, borderStyle: "dashed", borderColor: colors.borderStrong, backgroundColor: colors.canvas, gap: 6 },
  overlay: { alignItems: "center", justifyContent: "center", gap: 4 },
  remove: { position: "absolute", right: 0, top: 0, width: 44, height: 44, alignItems: "flex-end", justifyContent: "flex-start", padding: 5 },
  removeIcon: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.photoBadge, alignItems: "center", justifyContent: "center" },
  retry: { height: 28, paddingHorizontal: 8, backgroundColor: colors.canvas, borderRadius: 14, flexDirection: "row", alignItems: "center", gap: 4 },
  notice: { padding: 14, gap: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.accentBorder, backgroundColor: colors.accentFill },
  errorNotice: { borderColor: colors.errorBorder, backgroundColor: colors.errorBg },
});
