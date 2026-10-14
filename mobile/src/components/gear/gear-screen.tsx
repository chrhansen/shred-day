import { useRef, useState } from "react";
import { ActionSheetIOS, Alert, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../contexts/auth";
import { shred } from "../../services/shred";
import { ApiError } from "../../lib/api";
import type { Ski, Tag } from "../../lib/types";
import { colors } from "../../theme";
import { Button, EmptyState, Field, Icon, IconButton, Notice, Segmented, Text } from "../ui";
import { useToast } from "../ui/toast";
import { GearSwipeRow } from "./swipe-row";

export function GearScreen() {
  const { kind: initialKind, tab } = useLocalSearchParams<{ kind?: string; tab?: string }>();
  const requested = initialKind === "tags" || tab === "tags" ? "tags" : "skis";
  const [selection, setSelection] = useState<{ from: string; value: "skis" | "tags" }>({ from: requested, value: requested });
  const kind = selection.from === requested ? selection.value : requested;
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.surfaceSubtle }} edges={["top", "left", "right"]}>
    <Stack.Screen options={{ headerShown: false }} />
    <View style={gearStyles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back to Settings" onPress={() => router.canGoBack() ? router.back() : router.replace("/settings")}
        style={{ minHeight: 44, minWidth: 90, flexDirection: "row", alignItems: "center", gap: 2 }}>
        <Icon name="chevron-left" color={colors.primary} /><Text variant="navAction" style={{ color: colors.primary }}>Settings</Text>
      </Pressable>
      <Text variant="headline" accessibilityRole="header">Skis &amp; Tags</Text><View style={{ width: 90 }} />
    </View>
    <View style={{ paddingHorizontal: 16, paddingBottom: 12, backgroundColor: colors.canvas }}>
      <Segmented value={kind} onChange={(value) => setSelection({ from: requested, value })} options={[{ value: "skis", label: "Skis" }, { value: "tags", label: "Tags" }]} />
    </View>
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Collection key={kind} kind={kind} />
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
function Collection({ kind }: { kind: "skis" | "tags" }) {
  const { user } = useAuth();
  const client = useQueryClient();
  const toast = useToast();
  const query = useQuery({ queryKey: [kind, user?.id], queryFn: shred[kind] });
  const seasons = user?.available_seasons || [0];
  const journals = useQueries({ queries: seasons.map((season) => ({
    queryKey: ["days", season, user?.id], queryFn: () => shred.days(season), enabled: Boolean(user),
  })) });
  const usageReady = journals.every((journal) => Boolean(journal.data) && !journal.isError);
  const allDays = journals.flatMap((journal) => journal.data || []);
  const countFor = (item: Tag) => {
    const stored = kind === "skis" ? (item as Ski).days : undefined;
    return stored ? stored.length : usageReady ? allDays.filter((day) =>
      (kind === "skis" ? day.ski_names : day.tag_names).includes(item.name)).length : null;
  };
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [renamed, setRenamed] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const mutating = useRef(false);
  const refresh = () => { void client.invalidateQueries().catch(() => {}); };
  const add = async () => {
    if (!name.trim() || mutating.current) return;
    mutating.current = true;
    setBusy(true); setFailed(null);
    try {
      const item = await shred.createNamed(kind, name.trim());
      client.setQueryData<Tag[]>([kind, user?.id], (current = []) => [...current, item]);
      setName(""); Keyboard.dismiss(); toast(`${item.name} added`); refresh();
    } catch { setFailed(`Couldn't add this ${kind === "skis" ? "ski" : "tag"}. Check the name and try again.`); }
    finally { mutating.current = false; setBusy(false); }
  };
  const rename = async () => {
    if (!editing || !renamed.trim() || mutating.current || kind !== "skis") return;
    mutating.current = true;
    setBusy(true); setFailed(null);
    try {
      const updated = await shred.renameSki(editing, renamed.trim());
      client.setQueryData<Ski[]>([kind, user?.id], (current = []) =>
        current.map((item) => item.id === updated.id ? { ...item, ...updated } : item));
      setEditing(null); Keyboard.dismiss(); toast("Renamed"); refresh();
    } catch { setFailed("Couldn't rename this ski. Your original name is unchanged. Try again."); }
    finally { mutating.current = false; setBusy(false); }
  };
  const destroy = async (item: Tag) => {
    if (mutating.current) return;
    mutating.current = true;
    setBusy(true);
    try {
      await shred.deleteNamed(kind, item.id);
      client.setQueryData<Tag[]>([kind, user?.id], (current = []) => current.filter((value) => value.id !== item.id));
      toast(`${item.name} deleted`); refresh();
    } catch (error) {
      client.removeQueries({ queryKey: ["shared-day"] }); refresh();
      const usedTag = kind === "tags" && error instanceof ApiError && error.status === 422;
      Alert.alert(`Couldn't delete this ${kind === "skis" ? "ski" : "tag"}`,
        usedTag ? "This tag is still used by logged days. Remove it from those days before deleting it."
          : "Couldn't confirm deletion. Check your connection and try again.",
        [{ text: "Cancel", style: "cancel" }, { text: "Try Again", onPress: () => void destroy(item) }]);
    } finally { mutating.current = false; setBusy(false); }
  };
  const remove = (item: Tag) => {
    const count = countFor(item);
    Alert.alert(`Delete ${item.name}?`, kind === "tags" && count
      ? `This tag is used by ${count} logged ${count === 1 ? "day" : "days"}. Remove it from those days before deleting it.`
      : count !== null ? `It will be removed from ${count} logged ${count === 1 ? "day" : "days"}. The days stay in your journal.`
        : "It will be removed from any logged days that use it. The days stay in your journal.",
      [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: () => void destroy(item) }]);
  };
  const actions = (item: Tag) => {
    if (busy) return;
    const startRename = () => { setEditing(item.id); setRenamed(item.name); setFailed(null); };
    if (Platform.OS === "ios") ActionSheetIOS.showActionSheetWithOptions({ title: item.name,
      options: kind === "skis" ? ["Cancel", "Rename", "Delete"] : ["Cancel", "Delete"], cancelButtonIndex: 0,
      destructiveButtonIndex: kind === "skis" ? 2 : 1 }, (index) => {
      if (index === 1 && kind === "skis") startRename(); else if (index === (kind === "skis" ? 2 : 1)) remove(item);
    });
    else Alert.alert(item.name, undefined, [
      ...(kind === "skis" ? [{ text: "Rename", onPress: startRename }] : []),
      { text: "Delete", style: "destructive", onPress: () => remove(item) }, { text: "Cancel", style: "cancel" },
    ]);
  };
  return <View style={{ gap: 14 }}>
    {query.isPending && <Text style={{ color: colors.textSecondary }}>Loading {kind}…</Text>}
    {query.isError && <Notice error={new Error(`Couldn't load your ${kind}.`)} onRetry={() => void query.refetch()} />}
    {query.data?.length === 0 && <View style={gearStyles.empty}>
      <EmptyState icon={kind === "skis" ? "ski" : "tags"} title={kind === "skis" ? "No skis yet" : "No tags yet"}
        description={kind === "skis" ? "Add the skis you ride so you can pick them when you log a day." : "Add labels like Powder or With friends to sort your days."} />
    </View>}
    {Boolean(query.data?.length) && <View style={gearStyles.list}>
      {query.data?.map((item, index) => <GearSwipeRow key={item.id} disabled={busy || editing === item.id}
        onRename={kind === "skis" ? () => { setEditing(item.id); setRenamed(item.name); setFailed(null); } : undefined}
        onDelete={() => remove(item)}>
        <View style={[gearStyles.row, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider }]}>
        {editing === item.id ? <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ flex: 1 }}><Field label="Ski name" hideLabel autoFocus value={renamed} onChangeText={setRenamed} editable={!busy}
            maxLength={100} returnKeyType="done" onSubmitEditing={() => void rename()} /></View>
          <Button variant="text" title="Cancel" disabled={busy} onPress={() => setEditing(null)} />
          <Button variant="dark" title="Save" busy={busy} disabled={!renamed.trim()} onPress={() => void rename()} />
        </View> : <>
          <Pressable style={{ flex: 1, minHeight: 44, justifyContent: "center", gap: 2 }} accessibilityRole="button"
            accessibilityLabel={item.name + ", " + (countFor(item) === null ? "usage loading" : countFor(item) + " days")}
            onPress={() => actions(item)} onLongPress={() => actions(item)} disabled={busy}>
            <Text variant="bodyMedium">{item.name}</Text><Text variant="caption" style={{ color: colors.textSecondary }}>
              {countFor(item) === null ? "Usage unavailable" : `${countFor(item)} ${countFor(item) === 1 ? "day" : "days"}`}
            </Text>
          </Pressable>
          <IconButton name="more" accessibilityLabel={"Actions for " + item.name} color={colors.textSecondary} disabled={busy} onPress={() => actions(item)} />
        </>}
        </View>
      </GearSwipeRow>)}
    </View>}
    <Text variant="label" style={{ color: colors.textSecondary, marginHorizontal: 4 }}>Add a {kind === "skis" ? "ski" : "tag"}</Text>
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
      <View style={{ flex: 1 }}><Field label={kind === "skis" ? "New ski" : "New tag"} hideLabel value={name} onChangeText={setName}
        placeholder={kind === "skis" ? "e.g. Völkl Racetiger SL" : "e.g. Spring snow"} editable={!busy}
        maxLength={kind === "tags" ? 40 : 100} returnKeyType="done" onSubmitEditing={() => void add()} /></View>
      <Button title="Add" variant="dark" busy={busy && !editing} disabled={!name.trim() || busy} onPress={() => void add()} />
    </View>
    {failed && <Notice error={new Error(failed)} />}
    <Text variant="caption" style={{ color: colors.textSecondary, marginHorizontal: 4 }}>
      {kind === "skis" ? "Deleting a ski removes it from every day you logged with it. The days stay in your journal."
        : "Tags can describe conditions or who you skied with. Remove a tag from its logged days before deleting it."}
    </Text>
  </View>;
}
const gearStyles = StyleSheet.create({
  header: { minHeight: 52, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.canvas },
  list: { borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.canvas, overflow: "hidden" },
  row: { minHeight: 60, paddingHorizontal: 14, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 10 },
  empty: { borderWidth: 1, borderStyle: "dashed", borderColor: colors.borderStrong, borderRadius: 14, backgroundColor: colors.canvas },
});
