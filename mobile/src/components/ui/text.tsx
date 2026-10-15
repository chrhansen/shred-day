import { Text as NativeText, type TextProps } from "react-native";
import { colors, type } from "../../theme";

export function Text({ variant = "body", style, ...props }: TextProps & {
  variant?: keyof typeof type;
}) {
  return <NativeText allowFontScaling {...props} style={[type[variant], { color: colors.ink }, style]} />;
}
