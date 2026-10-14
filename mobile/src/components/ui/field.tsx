import { useState, type ReactNode, type Ref } from "react";
import { View, TextInput, type TextInputProps } from "react-native";
import { colors, radius, type } from "../../theme";
import { Icon, type IconName } from "./icon";
import { Text } from "./text";

export function Field({ label, helper, error, icon, leading, trailing, readOnly, hideLabel, inputRef, style,
  onFocus, onBlur, ...props }: TextInputProps & {
  label: string; helper?: string; error?: string; icon?: IconName;
  leading?: ReactNode; trailing?: ReactNode; readOnly?: boolean; hideLabel?: boolean; inputRef?: Ref<TextInput>;
}) {
  const [focused, setFocused] = useState(false);
  return <View style={{ gap: 6 }}>
    {!hideLabel && <Text variant="subhead" style={{ color: colors.text700 }}>{label}</Text>}
    <View style={{ borderRadius: radius.input, borderWidth: 1,
      borderColor: error ? colors.destructive : focused ? colors.primary : colors.border,
      backgroundColor: readOnly ? colors.surfaceSubtle : colors.canvas,
      flexDirection: "row", alignItems: props.multiline ? "flex-start" : "center",
      gap: 10, paddingHorizontal: 14, minHeight: 50 }}>
      {focused && <View pointerEvents="none" style={{ position: "absolute", top: -4,
        bottom: -4, left: -4, right: -4, borderRadius: 13, borderWidth: 3,
        borderColor: colors.accentFillStrong }} />}
      {icon && <Icon name={icon} size={18} color={colors.textMuted} />}
      {leading}
      <TextInput ref={inputRef} allowFontScaling accessibilityLabel={label} placeholderTextColor={colors.textMuted}
        {...props} editable={readOnly ? false : props.editable}
        onFocus={(event) => { setFocused(true); onFocus?.(event); }}
        onBlur={(event) => { setFocused(false); onBlur?.(event); }}
        style={[type.body, { flex: 1, minHeight: 48, paddingVertical: 12,
          color: readOnly ? colors.text600 : colors.ink, textAlignVertical: props.multiline ? "top" : "center" }, style]} />
      {trailing}
    </View>
    {error ? <Text variant="caption" accessibilityLiveRegion="polite"
      style={{ color: colors.destructive }}>{error}</Text>
      : helper ? <Text variant="caption" style={{ color: colors.textSecondary }}>{helper}</Text> : null}
  </View>;
}
