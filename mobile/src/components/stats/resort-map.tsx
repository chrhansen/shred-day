import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { Platform, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { LinearGradient } from "expo-linear-gradient";
import { mappedResorts, type StatsResort } from "../../lib/season-charts";
import { Button, Text, colors } from "../ui";
import { radius, shadow } from "../../theme";
import { MapFallback } from "./map-fallback";

export type ResortMapProps = { resorts: readonly StatsResort[]; selected: number; onSelect: (index: number) => void };
class MapBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
export function ResortMap({ resorts, selected, onSelect }: ResortMapProps) {
  const map = useRef<MapView>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [generation, setGeneration] = useState(0);
  const points = mappedResorts(resorts);
  useEffect(() => {
    if (ready) return;
    const timeout = setTimeout(() => setFailed(true), 12_000);
    return () => clearTimeout(timeout);
  }, [ready, generation]);
  const retry = () => { setReady(false); setFailed(false); setGeneration((value) => value + 1); };
  if (!points.length) return <MapFallback missing />;
  if (failed) return <MapFallback onRetry={retry} />;
  const fallback = <MapFallback onRetry={retry} />;
  return <MapBoundary key={generation} fallback={fallback}>
    <View style={{ gap: 4 }}>
      <View style={{ height: 210, borderRadius: radius.l, overflow: "hidden", marginHorizontal: -4 }}>
        <MapView ref={map} style={{ flex: 1 }} userInterfaceStyle="light"
          mapType={Platform.OS === "ios" ? "mutedStandard" : "standard"}
          showsCompass={false} showsPointsOfInterests={false} showsScale={false}
          rotateEnabled={false} pitchEnabled={false} loadingEnabled
          initialRegion={{ latitude: points[0].latitude, longitude: points[0].longitude,
            latitudeDelta: 0.4, longitudeDelta: 0.4 }}
          onMapReady={() => {
            setReady(true);
            if (points.length > 1) map.current?.fitToCoordinates(points.map((point) => ({ latitude: point.latitude,
              longitude: point.longitude })), { edgePadding: { top: 30, right: 30, bottom: 30, left: 30 }, animated: false });
          }}>
          {points.map((point, index) => {
            const sourceIndex = resorts.indexOf(point);
            const active = selected === sourceIndex;
            return <Marker key={`${point.name}-${index}`} coordinate={{ latitude: point.latitude, longitude: point.longitude }}
              accessibilityRole="button" accessibilityLabel={`${point.name}, ${point.daysSkied} days`}
              accessibilityState={{ selected: active }} onPress={() => onSelect(sourceIndex)}>
              <View style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
                <LinearGradient colors={active ? [colors.ink, colors.ink] : colors.primaryGradient}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[shadow.mapMarker, {
                    width: active ? 38 : 30, height: active ? 38 : 30, borderRadius: 22,
                    borderWidth: 2.5, borderColor: colors.canvas, alignItems: "center", justifyContent: "center" }]}>
                  <Text variant="label" style={{ color: colors.canvas }}>{point.daysSkied}</Text>
                </LinearGradient>
              </View>
            </Marker>;
          })}
        </MapView>
      </View>
      <View style={{ alignSelf: "flex-end" }}><Button variant="text" title="Map not loading?" onPress={() => setFailed(true)} /></View>
    </View>
  </MapBoundary>;
}
