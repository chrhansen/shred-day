import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text as NativeText,
  TextInput,
  View,
  type TextProps,
  type TextInputProps,
  type ViewProps,
  type RefreshControlProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { ReactNode } from "react";
export const colors = {
  paper: "#F5F1E9",
  white: "#FFFEFA",
  ink: "#152D35",
  muted: "#586E73",
  accent: "#B8482D",
  line: "#DADFD5",
  alpine: "#CFE1D4",
};
export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { padding: 24, paddingBottom: 100, gap: 18 },
  text: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 16,
    color: colors.ink,
    lineHeight: 24,
  },
  title: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 36,
    lineHeight: 42,
    letterSpacing: -1.5,
  },
  eyebrow: {
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 12,
    letterSpacing: 2,
    color: colors.accent,
    textTransform: "uppercase",
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  field: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    padding: 14,
    borderRadius: 12,
    color: colors.ink,
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 16,
    minHeight: 50,
  },
  button: {
    backgroundColor: colors.ink,
    minHeight: 50,
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  pill: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  muted: { color: colors.muted },
  error: { color: colors.accent },
});
export function Text({ style, ...props }: TextProps) {
  return <NativeText {...props} style={[styles.text, style]} />;
}
export function Screen({
  children,
  refreshControl,
}: {
  children: ReactNode;
  refreshControl?: React.ReactElement<RefreshControlProps>;
}) {
  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
        refreshControl={refreshControl}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
export function Heading({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.eyebrow}>SHRED.DAY / YOUR SEASON</Text>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      {subtitle && <Text style={styles.muted}>{subtitle}</Text>}
    </View>
  );
}
export function Card(props: ViewProps) {
  return <View {...props} style={[styles.card, props.style]} />;
}
export function Button({
  title,
  onPress,
  busy,
  secondary,
  disabled,
  destructive,
}: {
  title: string;
  onPress: () => void;
  busy?: boolean;
  secondary?: boolean;
  disabled?: boolean;
  destructive?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(busy || disabled) }}
      disabled={busy || disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: destructive
            ? colors.accent
            : secondary
              ? colors.alpine
              : colors.ink,
          opacity: busy || disabled ? 0.5 : pressed ? 0.75 : 1,
        },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={secondary ? colors.ink : colors.white} />
      ) : (
        <Text
          style={{
            fontFamily: "SpaceGrotesk_700Bold",
            color: secondary ? colors.ink : colors.white,
          }}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 13, color: colors.muted }}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        {...props}
        style={[styles.field, props.style]}
      />
    </View>
  );
}
export function Pill({
  title,
  selected,
  onPress,
}: {
  title: string;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.pill, selected && { backgroundColor: colors.ink }]}
    >
      <Text
        style={{ fontSize: 14, color: selected ? colors.white : colors.ink }}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export function Notice({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry?: () => void;
}) {
  return (
    <Card>
      <Text style={styles.error}>
        {error instanceof Error ? error.message : String(error)}
      </Text>
      {onRetry && <Button secondary title="Try again" onPress={onRetry} />}
    </Card>
  );
}
