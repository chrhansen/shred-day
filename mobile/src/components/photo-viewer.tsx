import { useRef, useState } from "react";
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import type { Photo } from "../lib/types";
import { colors, IconButton, Text } from "./ui";
import { ZoomablePhoto } from "./zoomable-photo";

export function PhotoViewer({ photos, initialIndex, onClose }: { photos: Photo[]; initialIndex: number; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const start = Math.max(0, Math.min(photos.length - 1, initialIndex));
  const [index, setIndex] = useState(start);
  const [zoomed, setZoomed] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const pages = useRef<FlatList<Photo>>(null);
  const pageHeight = Math.max(100, height - insets.top - insets.bottom - 152);
  const jump = (page: number) => {
    setZoomed(false); setResetKey((value) => value + 1); setIndex(page);
    pages.current?.scrollToIndex({ index: page, animated: true });
  };
  return <Modal visible presentationStyle="fullScreen" animationType="fade" onRequestClose={onClose}>
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#000" }}>
      <StatusBar style="light" />
      <View style={[styles.header, { paddingTop: insets.top, minHeight: insets.top + 52 }]}>
        <IconButton name="x" accessibilityLabel="Close photo viewer" onPress={onClose}
          color={colors.canvas} style={{ backgroundColor: "rgba(255,255,255,.14)" }} size={22} />
        <Text variant="chip" accessibilityLiveRegion="polite" style={{ color: colors.canvas }}>{index + 1} of {photos.length}</Text>
        <View style={{ width: 44 }} />
      </View>
      <View style={{ flex: 1, justifyContent: "center" }}>
        <FlatList ref={pages} key={width} data={photos} keyExtractor={(photo) => photo.id}
          horizontal pagingEnabled scrollEnabled={!zoomed} showsHorizontalScrollIndicator={false}
          initialScrollIndex={start} initialNumToRender={3} style={{ flexGrow: 0 }}
          getItemLayout={(_, page) => ({ length: width, offset: width * page, index: page })}
          onMomentumScrollEnd={(event) => { setIndex(Math.max(0, Math.min(photos.length - 1, Math.round(event.nativeEvent.contentOffset.x / width)))); setZoomed(false); }}
          renderItem={({ item, index: page }) => <ZoomablePhoto photo={item} width={width} height={pageHeight}
            active={page === index} zoomed={zoomed} resetKey={resetKey} onZoom={setZoomed} onClose={onClose} />} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}
        contentContainerStyle={{ flexGrow: 1, alignItems: "center", justifyContent: "center", gap: 10,
          paddingHorizontal: 16, paddingTop: 16, paddingBottom: insets.bottom + 16 }}>
        {photos.map((photo, page) => <Pressable key={photo.id} accessibilityRole="button"
          accessibilityLabel={`Show photo ${page + 1} of ${photos.length}`} accessibilityState={{ selected: page === index }}
          onPress={() => jump(page)} style={[styles.thumbnail, { opacity: page === index ? 1 : 0.6, borderColor: page === index ? colors.canvas : "transparent" }]}>
          <Image source={photo.preview_url || photo.full_url} contentFit="cover" style={{ width: 52, height: 52, borderRadius: 8 }} />
        </Pressable>)}
      </ScrollView>
    </GestureHandlerRootView>
  </Modal>;
}
const styles = StyleSheet.create({
  header: { paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  thumbnail: { borderWidth: 2, padding: 2, borderRadius: 12 },
});
