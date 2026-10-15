import type { ReactNode } from "react";
import { View, Pressable } from "react-native";
import Swipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import { colors } from "../../theme";
import { Icon, Text } from "../ui";

export function GearSwipeRow({ children, disabled, onRename, onDelete }: {
  children: ReactNode; disabled: boolean; onRename?: () => void; onDelete: () => void;
}) {
  return <Swipeable enabled={!disabled} overshootRight={false} rightThreshold={44}
    renderRightActions={(_, __, methods) => <View style={{ flexDirection: "row" }}>
      {onRename && <Pressable accessibilityRole="button" accessibilityLabel="Rename ski" disabled={disabled}
        onPress={() => { methods.close(); onRename(); }}
        style={{ width: 76, backgroundColor: colors.fill, alignItems: "center", justifyContent: "center", gap: 4 }}>
        <Icon name="pencil" color={colors.ink} /><Text variant="small">Rename</Text>
      </Pressable>}
      <Pressable accessibilityRole="button" accessibilityLabel="Delete item" disabled={disabled}
        onPress={() => { methods.close(); onDelete(); }}
        style={{ width: 76, backgroundColor: colors.destructive, alignItems: "center", justifyContent: "center", gap: 4 }}>
        <Icon name="trash" color={colors.canvas} /><Text variant="small" style={{ color: colors.canvas }}>Delete</Text>
      </Pressable>
    </View>}>
    <View style={{ backgroundColor: colors.canvas }}>{children}</View>
  </Swipeable>;
}
