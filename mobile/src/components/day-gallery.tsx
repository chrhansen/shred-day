import { useState } from "react";
import { FlatList, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { Photo } from "../lib/types";
import { colors, Icon, Text } from "./ui";
import { DayPhoto } from "./day-photo";

export function DayGallery({ photos, publicDay = false, onOpen }: {
  photos: Photo[]; publicDay?: boolean; onOpen: (index: number) => void;
}) {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const height = publicDay ? 300 : 400;
  return <View style={{ height }}>
    <FlatList data={photos} horizontal pagingEnabled showsHorizontalScrollIndicator={false}
      key={width} keyExtractor={(photo) => photo.id} initialNumToRender={2}
      getItemLayout={(_, page) => ({ length: width, offset: width * page, index: page })}
      onMomentumScrollEnd={(event) => setIndex(Math.max(0, Math.min(photos.length - 1, Math.round(event.nativeEvent.contentOffset.x / width))))}
      renderItem={({ item, index: page }) => <Pressable accessibilityRole="button"
        accessibilityLabel={`Open photo ${page + 1} of ${photos.length}`} onPress={() => onOpen(page)}>
        <DayPhoto photo={item} style={{ width, height }} />
      </Pressable>} />
    {!publicDay && <LinearGradient pointerEvents="none" colors={colors.photoTopShade}
      style={{ position: "absolute", top: 0, left: 0, right: 0, height: 130 }} />}
    {photos.length > 1 && <View pointerEvents="none" style={styles.dots}>
      {photos.map((photo, page) => <View key={photo.id} style={{ width: page === index ? 18 : 6,
        height: 6, borderRadius: 3, backgroundColor: page === index ? colors.canvas : "rgba(255,255,255,.55)" }} />)}
    </View>}
    <View pointerEvents="none" style={styles.counter}>
      <Icon name="camera" size={14} color={colors.canvas} />
      <Text variant="label" style={{ color: colors.canvas }}>{index + 1} / {photos.length}</Text>
    </View>
  </View>;
}
const styles = StyleSheet.create({
  dots: { position: "absolute", bottom: 16, alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 5 },
  counter: { position: "absolute", bottom: 12, right: 14, minHeight: 26, paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 13, backgroundColor: "rgba(15,23,42,.6)", flexDirection: "row", alignItems: "center", gap: 5 },
});
