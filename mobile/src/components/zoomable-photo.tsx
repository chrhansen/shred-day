import { useEffect } from "react";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import type { Photo } from "../lib/types";
import { DayPhoto } from "./day-photo";

export function ZoomablePhoto({ photo, width, height, active, zoomed, resetKey, onZoom, onClose }: {
  photo: Photo; width: number; height: number; active: boolean; zoomed: boolean;
  resetKey: number; onZoom: (zoomed: boolean) => void; onClose: () => void;
}) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const dismissY = useSharedValue(0);
  useEffect(() => {
    scale.set(1); savedScale.set(1); x.set(0); y.set(0); dismissY.set(0);
  }, [active, resetKey, scale, savedScale, x, y, dismissY]);
  const pinch = Gesture.Pinch().enabled(active)
    .onStart(() => scheduleOnRN(onZoom, true))
    .onUpdate((event) => { scale.set(Math.max(1, Math.min(4, savedScale.get() * event.scale))); })
    .onFinalize(() => {
      savedScale.set(scale.get());
      if (scale.get() <= 1.01) { x.set(withTiming(0)); y.set(withTiming(0)); }
      scheduleOnRN(onZoom, scale.get() > 1.01);
    });
  const doubleTap = Gesture.Tap().numberOfTaps(2).enabled(active).onEnd((_, success) => {
    if (!success) return;
    const next = scale.get() > 1.01 ? 1 : 2.5;
    scale.set(withTiming(next, { duration: 200 })); savedScale.set(next);
    x.set(withTiming(0)); y.set(withTiming(0));
    scheduleOnRN(onZoom, next > 1);
  });
  const move = Gesture.Pan().enabled(active && zoomed)
    .onStart(() => { startX.set(x.get()); startY.set(y.get()); })
    .onUpdate((event) => {
      const limitX = (scale.get() - 1) * width / 2;
      const limitY = (scale.get() - 1) * height / 2;
      x.set(Math.max(-limitX, Math.min(limitX, startX.get() + event.translationX)));
      y.set(Math.max(-limitY, Math.min(limitY, startY.get() + event.translationY)));
    });
  const dismiss = Gesture.Pan().enabled(active && !zoomed).activeOffsetY(12).failOffsetX([-24, 24])
    .onUpdate((event) => { dismissY.set(Math.max(0, event.translationY)); })
    .onEnd((event) => {
      if (event.translationY > 120 || event.velocityY > 900) scheduleOnRN(onClose);
      else dismissY.set(withTiming(0, { duration: 200 }));
    })
    .onFinalize(() => { dismissY.set(withTiming(0, { duration: 200 })); });
  const transform = useAnimatedStyle(() => ({ transform: [
    { translateX: x.get() }, { translateY: y.get() + dismissY.get() }, { scale: scale.get() },
  ] }));
  return <View style={{ width, height, overflow: "hidden" }}>
    <GestureDetector gesture={Gesture.Simultaneous(pinch, doubleTap, move, dismiss)}>
      <Animated.View style={[{ width, height }, transform]}>
        <DayPhoto photo={photo} fit="contain" dark style={{ width, height }} />
      </Animated.View>
    </GestureDetector>
  </View>;
}
