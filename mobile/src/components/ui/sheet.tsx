import { useEffect, useState, type ReactNode } from "react";
import { AccessibilityInfo, Animated, KeyboardAvoidingView, Modal, PanResponder,
  Platform, Pressable, ScrollView, View, useWindowDimensions, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, shadow } from "../../theme";
import { IconButton } from "./buttons";
import { Text } from "./text";
import { ToastViewport, useToastModal } from "./toast";

export function BottomSheet({ visible, onClose, title, children, footer,
  height = "fit", scroll = true, keyboardAvoiding = true, contentStyle,
  dismissible = true, cancelLabel, onDismiss, centerTitle = false, headerRight }: {
  visible: boolean; onClose: () => void; title: string; children: ReactNode;
  footer?: ReactNode; height?: "fit" | "medium" | "large"; scroll?: boolean;
  keyboardAvoiding?: boolean; contentStyle?: StyleProp<ViewStyle>; dismissible?: boolean; cancelLabel?: string;
  onDismiss?: () => void; centerTitle?: boolean; headerRight?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  useToastModal(visible);
  const window = useWindowDimensions();
  const [availableHeight, setAvailableHeight] = useState(window.height);
  const [translateY] = useState(() => new Animated.Value(0));
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const listener = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => listener.remove();
  }, []);
  useEffect(() => { if (visible) translateY.setValue(0); }, [visible, translateY]);
  const gesture = PanResponder.create({
    onMoveShouldSetPanResponder: (_, state) => dismissible && state.dy > 8 && Math.abs(state.dx) < state.dy,
    onPanResponderMove: (_, state) => translateY.setValue(Math.max(0, state.dy)),
    onPanResponderRelease: (_, state) => {
      if (state.dy > 80 || state.vy > 0.8) { onClose(); return; }
      Animated.timing(translateY, { toValue: 0, duration: reduceMotion ? 0 : 200,
        useNativeDriver: true }).start();
    },
    onPanResponderTerminate: () => translateY.setValue(0),
  });
  const maxHeight = Math.max(220, availableHeight - insets.top - 10);
  const body = scroll ? <ScrollView keyboardShouldPersistTaps="handled"
    keyboardDismissMode="interactive" style={{ flexShrink: 1 }}
    contentContainerStyle={[{ paddingHorizontal: 20, paddingBottom: 20, gap: 16 }, contentStyle]}>{children}</ScrollView>
    : <View style={[{ paddingHorizontal: 20, paddingBottom: 20, gap: 16 }, contentStyle]}>{children}</View>;
  return <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onDismiss={onDismiss}
    onRequestClose={() => { if (dismissible) onClose(); }}>
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}
      enabled={keyboardAvoiding} style={{ flex: 1 }}>
      <View accessibilityViewIsModal style={{ flex: 1, justifyContent: "flex-end" }}
        onLayout={(event) => setAvailableHeight(event.nativeEvent.layout.height)}>
      <Pressable accessible={false} disabled={!dismissible} onPress={onClose}
        style={{ position: "absolute", inset: 0, backgroundColor: colors.scrim }} />
      <Animated.View onAccessibilityEscape={() => { if (dismissible) onClose(); }} style={[shadow.sheet, {
        backgroundColor: colors.canvas, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
        paddingBottom: availableHeight < window.height - 80 ? 12 : Math.max(insets.bottom, 12), maxHeight,
        ...(height === "large" ? { height: maxHeight } : height === "medium" ? { maxHeight: maxHeight * 0.7 } : {}),
        transform: [{ translateY }], overflow: "hidden" }]}>
        <View {...gesture.panHandlers} style={{ alignItems: "center", paddingTop: 8, paddingBottom: 4 }}>
          <View accessible={false} style={{ width: 36, height: 5, backgroundColor: colors.borderStrong, borderRadius: 3 }} />
        </View>
        <View style={{ minHeight: 52, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", gap: 12 }}>
          {cancelLabel && <Pressable accessibilityRole="button" disabled={!dismissible}
            accessibilityState={{ disabled: !dismissible }} onPress={onClose}
            style={{ minHeight: 44, minWidth: 70, justifyContent: "center", opacity: dismissible ? 1 : 0.4 }}>
            <Text variant="navAction" style={{ color: colors.primary }}>{cancelLabel}</Text>
          </Pressable>}
          {!cancelLabel && centerTitle && <View style={{ width: 44 }} />}
          <Text accessibilityRole="header" variant={cancelLabel || centerTitle ? "headline" : "sheetTitle"}
            style={{ flex: 1, textAlign: cancelLabel || centerTitle ? "center" : "left" }}>{title}</Text>
          {cancelLabel ? <View style={{ minWidth: 70, alignItems: "flex-end" }}>{headerRight}</View> : headerRight ?? (dismissible && <IconButton name="x" accessibilityLabel={"Close " + title} onPress={onClose}
            style={{ backgroundColor: colors.fill }} size={20} />)}
        </View>
        {body}
        {footer && <View style={{ paddingHorizontal: 20, paddingTop: 12, gap: 12,
          borderTopWidth: 1, borderTopColor: colors.divider }}>{footer}</View>}
      </Animated.View>
      <ToastViewport bottomOffset={16} inModal />
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}
