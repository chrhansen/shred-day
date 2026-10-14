import { useRef, useState } from "react";
import { ActivityIndicator, Alert, Platform, Share, StyleSheet, Switch, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import { displayDate } from "../lib/dates";
import type { Day } from "../lib/types";
import { useAuth } from "../contexts/auth";
import { useDaySharing } from "../hooks/use-day-sharing";
import { Button, colors, Icon, Notice, Text, type IconName } from "./ui";
import { BottomSheet } from "./ui/sheet";
import { useToast } from "./ui/toast";

export function DayShareSheet({ day, visible, onClose }: { day: Day; visible: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const toast = useToast();
  const sharing = useDaySharing(day.id);
  const [action, setAction] = useState<"share" | "copy" | null>(null);
  const [actionFailure, setActionFailure] = useState<"share" | "copy" | null>(null);
  const preview = useRef(false);
  const enabled = Boolean(day.shared_at);
  const url = "https://shred.day/d/" + day.id;
  const title = day.resort.name + " · " + displayDate(day.date);
  const change = (next: boolean) => {
    if (sharing.busy) return;
    if (next) { void sharing.update(true); return; }
    Alert.alert("Stop sharing this day?", "The public link will stop working for anyone who has it. You can share it again later.", [
      { text: "Cancel", style: "cancel" },
      { text: "Stop Sharing", style: "destructive", onPress: () => void sharing.update(false) },
    ]);
  };
  const perform = async (kind: "share" | "copy") => {
    if (action || !enabled || sharing.busy) return;
    setAction(kind); setActionFailure(null);
    try {
      if (kind === "share") await Share.share({ url, title, ...(Platform.OS === "android" ? { message: url } : {}) }, { subject: title });
      else { if (!await Clipboard.setStringAsync(url)) throw new Error("Clipboard unavailable"); toast("Link copied"); }
    } catch { setActionFailure(kind); }
    finally { setAction(null); }
  };
  const openPreview = () => {
    preview.current = true; onClose();
    if (Platform.OS !== "ios") dismiss();
  };
  const dismiss = () => {
    if (!preview.current) return;
    preview.current = false;
    router.push({ pathname: "/d/[id]", params: { id: day.id } });
  };
  const visibleItems: { icon: IconName; title: string }[] = [
    { icon: "image", title: day.photos.length + (day.photos.length === 1 ? " photo" : " photos") },
    { icon: "pin", title: "Resort and date" }, { icon: "tags", title: "Skis and tags" },
    { icon: "pencil", title: "Notes" }, ...(user?.username ? [{ icon: "user" as const, title: "@" + user.username }] : []),
  ];
  return <BottomSheet visible={visible} onClose={onClose} onDismiss={dismiss} title="Share this day"
    dismissible={!sharing.busy && !action}>
    <Text variant="footnote" style={{ color: colors.textSecondary, marginTop: -8 }}>{title}</Text>
    <View style={styles.toggleCard}>
      <View style={{ flex: 1, gap: 4 }}><Text variant="bodyMedium" style={{ fontFamily: "SpaceGrotesk_700Bold" }}>Public link</Text>
        <Text variant="footnote" style={{ color: colors.textSecondary }}>Anyone with the link can view this day</Text>
      </View>
      {sharing.busy && <ActivityIndicator color={colors.indigo} />}
      <Switch accessibilityLabel="Public link" accessibilityHint="Makes this day's photos, resort, skis, tags and notes public"
        value={enabled} disabled={sharing.busy || Boolean(action)} onValueChange={change}
        trackColor={{ false: colors.border, true: colors.primary }} />
    </View>
    <Text variant="footnote" style={{ color: colors.textSecondary }}>{enabled ? "People with the link can see:" : "If you turn this on, people with the link will see:"}</Text>
    <View style={styles.wrap}>{visibleItems.map((item) => <View key={item.title} style={styles.visibility}>
      <Icon name={item.icon} size={14} color={colors.text700} /><Text variant="caption" style={{ color: colors.text700 }}>{item.title}</Text>
    </View>)}</View>
    <View style={{ gap: 4 }}>
      <Text variant="caption" style={{ color: colors.textSecondary }}>Photos may include their recorded location and capture time.</Text>
      <Text variant="caption" style={{ color: colors.textSecondary }}>Your email address stays private.</Text>
    </View>
    {sharing.failed && <Notice message="Couldn't confirm the sharing update. Check your connection and try again." onRetry={() => void sharing.retry()} />}
    {enabled && <>
      <Text selectable accessibilityLabel="Public day link" style={styles.link}>{url.replace("https://", "")}</Text>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Button title="Share Link…" icon="share" style={{ flex: 1 }} busy={action === "share"} disabled={sharing.busy || action === "copy"} onPress={() => void perform("share")} />
        <Button variant="secondary" title="Copy" icon="copy" busy={action === "copy"} disabled={sharing.busy || action === "share"} onPress={() => void perform("copy")} />
      </View>
      <Button variant="text" title="Preview public page" disabled={sharing.busy || Boolean(action)} onPress={openPreview} />
    </>}
    {actionFailure && <Notice message={actionFailure === "copy" ? "Couldn't copy the link. Try again." : "Couldn't open sharing. Try again."} onRetry={() => void perform(actionFailure)} />}
  </BottomSheet>;
}
const styles = StyleSheet.create({
  toggleCard: { padding: 14, borderWidth: 1, borderColor: colors.border, borderRadius: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  visibility: { minHeight: 28, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6,
    flexDirection: "row", gap: 5, alignItems: "center", backgroundColor: colors.fill },
  link: { padding: 12, borderRadius: 10, backgroundColor: colors.fill, fontFamily: "Menlo", fontSize: 14, lineHeight: 20 },
});
