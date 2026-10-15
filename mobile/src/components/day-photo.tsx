import { useState } from "react";
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Image } from "expo-image";
import type { Photo } from "../lib/types";
import { Button, colors, Icon, Text } from "./ui";

export function DayPhoto({ photo, fit = "cover", style, dark = false }: {
  photo: Photo; fit?: "cover" | "contain"; style?: StyleProp<ViewStyle>; dark?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  const uri = photo.full_url || photo.preview_url;
  return <View style={[{ backgroundColor: dark ? "#000" : colors.fill, overflow: "hidden" }, style]}>
    {uri && !failed ? <>
      <Image key={photo.id + ":" + attempt} source={uri} contentFit={fit}
        style={StyleSheet.absoluteFill} accessibilityLabel={photo.filename || "Photo from this day"}
        cachePolicy={attempt ? "none" : "disk"} onLoadStart={() => setLoading(true)}
        onLoad={() => setLoading(false)} onError={() => { setFailed(true); setLoading(false); }} />
      {loading && <View pointerEvents="none" style={styles.center}><ActivityIndicator color={dark ? colors.canvas : colors.indigo} /></View>}
    </> : <View style={styles.center}>
      <Icon name="image-off" size={34} color={dark ? colors.canvas : colors.textSecondary} />
      <Text variant="chip" style={{ color: dark ? colors.canvas : colors.textSecondary }}>{uri ? "Photo couldn't load" : "Photo is processing"}</Text>
      {uri && <Button variant="compact" title="Retry" icon="refresh" onPress={() => { setAttempt((value) => value + 1); setFailed(false); setLoading(true); }} />}
    </View>}
  </View>;
}
const styles = StyleSheet.create({ center: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", gap: 12 } });
