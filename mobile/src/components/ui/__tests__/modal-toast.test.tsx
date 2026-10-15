import { act, fireEvent, render, within } from "@testing-library/react-native";
import { AccessibilityInfo, Modal, Pressable, Text } from "react-native";
import { BottomSheet } from "../sheet";
import { ToastProvider, useToast } from "../toast";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));
function CopyLink() {
  const toast = useToast();
  return <Pressable accessibilityRole="button" onPress={() => toast("Link copied")}><Text>Copy link</Text></Pressable>;
}
test("sheet feedback renders inside its native modal and is announced once", async () => {
  const announce = jest.spyOn(AccessibilityInfo, "announceForAccessibility");
  const reduce = jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
  const screen = render(<ToastProvider><BottomSheet visible title="Share this day" onClose={() => {}}>
    <CopyLink />
  </BottomSheet></ToastProvider>);
  await act(async () => { await Promise.resolve(); });
  fireEvent.press(screen.getByRole("button", { name: "Copy link" }));
  expect(within(screen.UNSAFE_getByType(Modal)).getByText("Link copied")).toBeTruthy();
  expect(screen.getAllByText("Link copied")).toHaveLength(1);
  expect(announce).toHaveBeenCalledTimes(1);
  expect(announce).toHaveBeenCalledWith("Link copied");
  screen.unmount(); announce.mockRestore(); reduce.mockRestore();
});
