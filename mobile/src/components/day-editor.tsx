import { useEffect, useRef, useState, type ReactNode } from "react";
import { Alert, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router, Stack, useNavigation } from "expo-router";
import { usePreventRemove } from "expo-router/react-navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { shred } from "../services/shred";
import { dateString, parseDay, seasonLabel } from "../lib/dates";
import { localeWeekStart } from "../lib/journal";
import { dayFormKey, emptyDayForm, formForDay, projectedDayNumber, seasonForDate, type DayForm } from "../lib/day-form";
import type { Day, Resort, Tag } from "../lib/types";
import { useAuth } from "../contexts/auth";
import { useDayPhotos } from "../hooks/use-day-photos";
import { colors } from "../theme";
import { Button, Field, Icon, Notice, Pill, Screen, Text } from "./ui";
import { Calendar } from "./ui/calendar";
import { useToast } from "./ui/toast";
import { ResortSheet } from "./editor/resort-sheet";
import { NamedItemSheet } from "./editor/named-item-sheet";
import { EditorPhotos } from "./editor/editor-photos";

type EditorProps = { id?: string; initialDate?: string };
export function DayEditor(props: EditorProps) {
  return <SafeAreaProvider><DayEditorContent {...props} /></SafeAreaProvider>;
}
function DayEditorContent({ id, initialDate }: EditorProps) {
  const { user } = useAuth();
  const query = useQuery({ queryKey: ["day", id, user?.id], queryFn: () => shred.day(id!), enabled: Boolean(id) });
  if (id && query.isPending) return <Screen><Text>Loading your day…</Text></Screen>;
  if (id && query.isError && !query.data) return <Screen>
    <Button variant="text" title="Back" onPress={() => router.back()} />
    <Notice error={new Error("Couldn't load this day. Check your connection and try again.")} onRetry={() => void query.refetch()} />
  </Screen>;
  return <EditorForm key={(user?.id || "") + (id || "new")} id={id} initialDate={initialDate} initialDay={query.data} />;
}
function EditorForm({ id, initialDate, initialDay }: { id?: string; initialDate?: string; initialDay?: Day }) {
  const client = useQueryClient();
  const auth = useAuth();
  const navigation = useNavigation();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const owner = useRef(auth.user?.id);
  const scroll = useRef<ScrollView>(null);
  const resortPosition = useRef(0);
  const notesPosition = useRef(0);
  const [form, setForm] = useState<DayForm>(() => {
    if (initialDay) return formForDay(initialDay);
    const value = emptyDayForm();
    if (initialDate && /^\d{4}-\d{2}-\d{2}$/.test(initialDate) && dateString(parseDay(initialDate)) === initialDate) value.date = initialDate;
    return value;
  });
  const [baseline] = useState(() => dayFormKey(form, initialDay?.photos.map((photo) => photo.id) || []));
  const saving = useRef(false);
  const [busy, setBusy] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [tried, setTried] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [month, setMonth] = useState(form.date);
  const [resortOpen, setResortOpen] = useState(false);
  const [adding, setAdding] = useState<"skis" | "tags" | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const photoState = useDayPhotos(initialDay?.photos || []);
  const skis = useQuery({ queryKey: ["skis", auth.user?.id], queryFn: shred.skis });
  const tags = useQuery({ queryKey: ["tags", auth.user?.id], queryFn: shred.tags });
  const recent = useQuery({ queryKey: ["recent-resorts", auth.user?.id], queryFn: shred.recentResorts });
  const season = seasonForDate(form.date, auth.user?.season_start_day || "09-01");
  const days = useQuery({ queryKey: ["days", season, auth.user?.id], queryFn: () => shred.days(season) });
  const calendarSeason = seasonForDate(month, auth.user?.season_start_day || "09-01");
  const calendarDays = useQuery({ queryKey: ["days", calendarSeason, auth.user?.id],
    queryFn: () => shred.days(calendarSeason), enabled: calendarOpen && calendarSeason !== season });
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow", () => setKeyboardVisible(true));
    const hide = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide", () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  const dirty = baseline !== dayFormKey(form, photoState.photos.map((photo) => photo.id || photo.key));
  usePreventRemove(Boolean(auth.user) && !savedId && (dirty || busy), ({ data }) => {
    if (saving.current) return;
    Alert.alert("Discard changes?", id ? "Your edits to this day won't be saved." : "This day won't be saved.", [
      { text: "Keep Editing", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: () => navigation.dispatch(data.action) },
    ]);
  });
  useEffect(() => {
    if (savedId) {
      const destination = { pathname: "/day/[id]" as const, params: { id: savedId } };
      if (id) router.dismissTo(destination); else router.replace(destination);
    }
  }, [id, savedId]);
  const change = <K extends keyof DayForm>(key: K, value: DayForm[K]) => setForm((current) => ({ ...current, [key]: value }));
  const toggle = (key: "skiIds" | "tagIds", itemId: string) => setForm((current) => ({ ...current,
    [key]: current[key].includes(itemId) ? current[key].filter((value) => value !== itemId) : [...current[key], itemId] }));
  const save = async () => {
    if (saving.current || photoState.pending || owner.current !== auth.user?.id) return;
    setTried(true);
    if (!form.resort) { scroll.current?.scrollTo({ y: Math.max(0, resortPosition.current - 16), animated: true }); return; }
    saving.current = true; setBusy(true); setFailed(false); Keyboard.dismiss();
    try {
      const day = await shred.saveDay({ date: form.date, resort_id: form.resort.id, ski_ids: form.skiIds,
        tag_ids: form.tagIds, notes: form.notes.trim() || null,
        photo_ids: photoState.photos.flatMap((photo) => photo.id ? [photo.id] : []) }, id, {
        resort: form.resort, skis: (skis.data || []).filter((ski) => form.skiIds.includes(ski.id)),
        tags: (tags.data || []).filter((tag) => form.tagIds.includes(tag.id)),
        photos: photoState.photos.flatMap((photo) => photo.id ? [{ id: photo.id, filename: null, preview_url: photo.uri, full_url: photo.uri }] : []),
      });
      photoState.commit();
      client.setQueryData(["day", day.id, auth.user?.id], day);
      void client.invalidateQueries(); void auth.refresh().catch(() => {});
      toast("Saved on device · waiting to sync"); setSavedId(day.id);
    } catch { setFailed(true); }
    finally { saving.current = false; setBusy(false); }
  };
  const added = (item: Tag) => {
    if (!adding) return;
    const kind = adding;
    client.setQueryData<Tag[]>([kind, auth.user?.id], (current = []) => current.some((value) => value.id === item.id) ? current : [...current, item]);
    setForm((current) => ({ ...current, [kind === "skis" ? "skiIds" : "tagIds"]:
      [...new Set([...current[kind === "skis" ? "skiIds" : "tagIds"], item.id])] }));
  };
  const choices: Resort[] = [...(form.resort ? [form.resort] : []), ...(recent.data || [])]
    .filter((resort, index, all) => all.findIndex((item) => item.id === resort.id) === index).slice(0, 5);
  const dateLabel = parseDay(form.date).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric", year: "numeric" });
  const dayNumber = id && initialDay?.date === form.date ? initialDay.day_number
    : days.data ? projectedDayNumber(days.data, form.date, id) : null;
  const dateMeta = dayNumber ? (id ? "Day " : "Will be day ") + dayNumber + " of " + seasonLabel(season) : seasonLabel(season);
  return <SafeAreaView edges={["top", "left", "right"]} style={editorStyles.screen}>
    <Stack.Screen options={{ headerShown: false, gestureEnabled: !dirty && !busy }} />
    <View style={editorStyles.nav}>
      <Pressable accessibilityRole="button" accessibilityLabel="Cancel day editor" disabled={busy}
        onPress={() => router.canGoBack() ? router.back() : router.replace("/")} style={editorStyles.navAction}>
        <Text variant="navAction" style={{ color: colors.primary, opacity: busy ? 0.4 : 1 }}>Cancel</Text>
      </Pressable>
      <Text variant="headline" accessibilityRole="header">{id ? "Edit Day" : "Log Day"}</Text>
      <View style={{ width: 74 }} />
    </View>
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
      <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive"
        contentContainerStyle={editorStyles.content}>
        <Section title="Date" meta="Required">
          <Pressable accessibilityRole="button" accessibilityLabel={"Date, " + dateLabel} accessibilityState={{ expanded: calendarOpen, disabled: busy }}
            disabled={busy} onPress={() => { setCalendarOpen((open) => !open); setMonth(form.date); }} style={editorStyles.dateRow}>
            <Icon name="calendar" color={colors.primary} />
            <View style={{ flex: 1, gap: 2 }}><Text variant="bodyMedium">{dateLabel}</Text>
              <Text variant="caption" style={{ color: colors.textSecondary }}>{dateMeta}</Text></View>
            <View style={{ transform: [{ rotate: calendarOpen ? "180deg" : "0deg" }] }}><Icon name="chevron-down" color={colors.textMuted} /></View>
          </Pressable>
          {calendarOpen && <View style={editorStyles.calendar}><Calendar month={month} selected={form.date} weekStartsOn={localeWeekStart()}
            loggedDates={(calendarSeason === season ? days.data : calendarDays.data)?.map((day) => day.date)} onMonthChange={setMonth}
            onSelect={(date) => { change("date", date); setCalendarOpen(false); }} /></View>}
        </Section>
        <View onLayout={(event) => { resortPosition.current = event.nativeEvent.layout.y; }}>
          <Section title="Resort" meta="Required">
            <View style={editorStyles.chips}>
              {choices.map((resort) => <Pill key={resort.id} title={resort.name} role="radio" selected={form.resort?.id === resort.id}
                disabled={busy} error={tried && !form.resort} onPress={() => change("resort", resort)} />)}
              <Pill title="Find resort" icon="search" role="button" disabled={busy} error={tried && !form.resort} onPress={() => setResortOpen(true)} />
            </View>
            {tried && !form.resort && <View accessibilityLiveRegion="polite" style={editorStyles.errorRow}>
              <Icon name="alert" color={colors.destructive} size={16} /><Text variant="subhead" style={{ color: colors.destructive }}>Choose the resort you skied.</Text>
            </View>}
            {recent.isPending && <Text variant="caption" style={{ color: colors.textSecondary }}>Loading recent resorts…</Text>}
          </Section>
        </View>
        <Section title="Skis" meta="Optional · pick any">
          {skis.isError && <Notice error={new Error("Couldn't load your skis.")} onRetry={() => void skis.refetch()} />}
          <View style={editorStyles.chips}>{skis.data?.map((ski) => <Pill key={ski.id} title={ski.name} disabled={busy}
            selected={form.skiIds.includes(ski.id)} onPress={() => toggle("skiIds", ski.id)} />)}
            <Pill title="Add ski" icon="plus" role="button" dashed disabled={busy} onPress={() => setAdding("skis")} />
          </View>
        </Section>
        <Section title="Tags" meta="Optional · pick any">
          {tags.isError && <Notice error={new Error("Couldn't load your tags.")} onRetry={() => void tags.refetch()} />}
          <View style={editorStyles.chips}>{tags.data?.map((tag) => <Pill key={tag.id} title={tag.name} disabled={busy}
            selected={form.tagIds.includes(tag.id)} onPress={() => toggle("tagIds", tag.id)} />)}
            <Pill title="Add tag" icon="plus" role="button" dashed disabled={busy} onPress={() => setAdding("tags")} />
          </View>
        </Section>
        <View onLayout={(event) => { notesPosition.current = event.nativeEvent.layout.y; }}>
          <Section title="Notes" meta={form.notes.length + "/500"}>
            <Field label="Notes" hideLabel value={form.notes} onChangeText={(notes) => change("notes", notes.slice(0, 500))}
              placeholder="How was the day? Snow, runs, who you skied with…" multiline maxLength={500} editable={!busy}
              style={{ minHeight: 110, textAlignVertical: "top", paddingTop: 12 }}
              onFocus={() => scroll.current?.scrollTo({ y: Math.max(0, notesPosition.current - 16), animated: true })} />
          </Section>
        </View>
        <Section title="Photos" meta={photoState.photos.length ? photoState.photos.length + (photoState.photos.length === 1 ? " photo" : " photos") : "Optional"}>
          <EditorPhotos state={photoState} disabled={busy} />
        </Section>
      </ScrollView>
      <View style={[editorStyles.footer, { paddingBottom: 12 + (keyboardVisible ? 0 : insets.bottom) }]}>
        {failed && <Notice error={new Error("Couldn't save this day on your device. Your changes are still here. Please try again.")} />}
        <Button title={busy ? "Saving…" : id ? "Update Day" : "Save Day"} busy={busy} disabled={photoState.pending}
          accessibilityHint={photoState.pending ? "Retry or remove failed photos and wait for uploads to finish." : undefined} onPress={() => void save()} />
      </View>
    </KeyboardAvoidingView>
    <ResortSheet visible={resortOpen} selected={form.resort} onClose={() => setResortOpen(false)} onSelect={(resort) => change("resort", resort)} />
    <NamedItemSheet kind={adding || "skis"} visible={Boolean(adding)} onClose={() => setAdding(null)} onCreated={added} />
  </SafeAreaView>;
}
function Section({ title, meta, children }: { title: string; meta: string; children: ReactNode }) {
  return <View style={{ gap: 10 }}><View style={editorStyles.sectionHeader}>
    <Text variant="headline" accessibilityRole="header">{title}</Text>
    <Text variant="small" style={{ color: meta === "Required" ? colors.textSecondary : colors.textMuted }}>{meta}</Text>
  </View>{children}</View>;
}
const editorStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  nav: { minHeight: 52, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  navAction: { width: 74, minHeight: 44, justifyContent: "center" },
  content: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 28, gap: 28 },
  sectionHeader: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8, justifyContent: "space-between" },
  dateRow: { minHeight: 58, paddingVertical: 8, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 12,
    borderWidth: 1, borderColor: colors.border, borderRadius: 12 },
  calendar: { padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  errorRow: { flexDirection: "row", gap: 6, alignItems: "center" },
  footer: { paddingTop: 12, paddingHorizontal: 16, gap: 10, backgroundColor: colors.canvas, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
});
