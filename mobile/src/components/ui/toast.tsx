import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AccessibilityInfo, Animated, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, motion, radius, shadow } from "../../theme";
import { Icon } from "./icon";
import { Text } from "./text";

const ToastContext = createContext<(message: string) => void>((message) => {
  AccessibilityInfo.announceForAccessibility(message);
});
const ToastViewContext = createContext<{
  message: string | null; progress: Animated.Value | null; reduceMotion: boolean;
  modalCount: number; registerModal: () => () => void;
}>({ message: null, progress: null, reduceMotion: false, modalCount: 0, registerModal: () => () => {} });
export const useToast = () => useContext(ToastContext);
export function useToastModal(visible: boolean) {
  const { registerModal } = useContext(ToastViewContext);
  useEffect(() => visible ? registerModal() : undefined, [visible, registerModal]);
}
export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const [progress] = useState(() => new Animated.Value(0));
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [modalCount, setModalCount] = useState(0);
  const registerModal = useCallback(() => {
    setModalCount((count) => count + 1);
    return () => setModalCount((count) => Math.max(0, count - 1));
  }, []);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const listener = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => { listener.remove(); clearTimeout(timer.current); };
  }, []);
  const toast = useCallback((value: string) => {
    clearTimeout(timer.current);
    progress.stopAnimation(); progress.setValue(0);
    setMessage(value);
    AccessibilityInfo.announceForAccessibility(value);
    if (reduceMotion) progress.setValue(1);
    else Animated.timing(progress, { toValue: 1, duration: motion.standard,
      useNativeDriver: true }).start();
    timer.current = setTimeout(() => {
      if (reduceMotion) { progress.setValue(0); setMessage(null); }
      else Animated.timing(progress, { toValue: 0, duration: motion.standard,
        useNativeDriver: true }).start(({ finished }) => { if (finished) setMessage(null); });
    }, motion.toast);
  }, [progress, reduceMotion]);
  return <ToastContext.Provider value={toast}>
    <ToastViewContext.Provider value={{ message, progress, reduceMotion, modalCount, registerModal }}>{children}<ToastViewport /></ToastViewContext.Provider>
  </ToastContext.Provider>;
}
export function ToastViewport({ bottomOffset = 134, inModal = false }: { bottomOffset?: number; inModal?: boolean }) {
  const insets = useSafeAreaInsets();
  const { message, progress, reduceMotion, modalCount } = useContext(ToastViewContext);
  if (modalCount && !inModal) return null;
  return <>
    {message && <View pointerEvents="none" style={{ position: "absolute", left: 20, right: 20,
      bottom: insets.bottom + bottomOffset, alignItems: "center" }}>
      <Animated.View style={[shadow.toast, { maxWidth: 320, paddingHorizontal: 16,
        paddingVertical: 12, borderRadius: radius.card, backgroundColor: colors.ink,
        flexDirection: "row", alignItems: "center", gap: 8, opacity: progress ?? 1,
        transform: [{ translateY: reduceMotion || !progress ? 0 : progress.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }]}>
        <Icon name="circle-check" size={18} color={colors.toastIcon} />
        <Text variant="subhead" style={{ color: colors.canvas, flexShrink: 1 }}>{message}</Text>
      </Animated.View>
    </View>}
  </>;
}
