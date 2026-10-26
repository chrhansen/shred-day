import { useRef, useState } from "react";
import { Pressable, RefreshControl, ScrollView, SectionList, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { router, useScrollToTop } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { shred } from "../../services/shred";
import { useAuth } from "../../contexts/auth";
import { dateString, parseDay } from "../../lib/dates";
import { initialSeasonDate, journalSections, journalSelection, localeWeekStart, monthStart, selectedDateTitle } from "../../lib/journal";
import { Button, colors, EmptyState, Icon, IconSegmented, Notice, shadow, Skeleton, Text } from "../../components/ui";
import { SeasonHeader, seasonDateRange, useSeason } from "../../components/season-picker";
import { Calendar } from "../../components/ui/calendar";
import { JournalRow, JournalSeparator } from "../../components/journal-row";
import { showDayActions, useDayActions } from "../../hooks/use-day-actions";
import type { DayEntry } from "../../lib/types";
import { SyncNotice } from "../../components/sync-notice";

export default function DaysScreen() {
  const { user } = useAuth();
  const { season, setSeason } = useSeason();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<"list" | "calendar">("list");
  const [selection, setSelection] = useState<{ season: number; date: string; month: string } | null>(null);
  const listRef = useRef<SectionList<DayEntry>>(null);
  const calendarRef = useRef<ScrollView>(null);
  useScrollToTop(listRef);
  useScrollToTop(calendarRef);
  const { remove } = useDayActions();
  const days = useQuery({ queryKey: ["days", season, user?.id],
    queryFn: () => shred.days(season), enabled: Boolean(user) });
  const seasonStart = user?.season_start_day || "09-01";
  const range = seasonDateRange(season, seasonStart);
  const minDate = dateString(range.start), maxDate = dateString(range.end);
  const entries = days.data || [];
  const defaultCandidate = journalSelection(entries, initialSeasonDate(season, seasonStart));
  const defaultDate = defaultCandidate < minDate ? minDate : defaultCandidate > maxDate ? maxDate : defaultCandidate;
  const currentSelection = selection?.season === season && selection.date >= minDate && selection.date <= maxDate &&
    selection.month >= monthStart(minDate) && selection.month <= monthStart(maxDate) ? selection : null;
  const selected = currentSelection?.date || defaultDate;
  const month = currentSelection?.month || monthStart(defaultDate);
  const selectedDays = entries.filter((day) => day.date === selected);
  const firstLoad = days.isPending && !days.data;
  const failed = Boolean(days.error && !days.data);
  const firstUse = (user?.available_seasons.length || 0) === 0;
  const openDay = (day: DayEntry, sharing = false) => router.push({ pathname: "/day/[id]", params: { id: day.id, ...(sharing ? { share: "1" } : {}) } });
  const editDay = (day: DayEntry) => router.push({ pathname: "/log/[id]", params: { id: day.id } });
  const actions = (day: DayEntry) => showDayActions({ share: () => openDay(day, true), edit: () => editDay(day),
    remove: () => remove({ id: day.id, date: day.date, resort: day.resort_name, photos: day.photos?.length }, () => {}) });
  const log = (date?: string) => router.push({ pathname: "/log", params: { date: date || dateString(new Date()) } });
  const refreshControl = <RefreshControl tintColor={colors.indigo} refreshing={days.isRefetching}
    onRefresh={() => void days.refetch()} />;
  const feedback = firstLoad ? <View accessibilityLabel="Loading your days" style={{ paddingTop: 12 }}>
    {[0, 1, 2, 3].map((row) => <View key={row} style={styles.skeletonRow}>
      <Skeleton width={84} height={84} borderRadius={12} />
      <View style={{ flex: 1, gap: 9 }}><Skeleton width="60%" /><Skeleton width="35%" height={12} /><Skeleton width="80%" height={12} /></View>
    </View>)}
  </View> : failed ? <EmptyState icon="wifi-off" title="Couldn't load your days"
    description="Shred.Day needs a connection. Check your network and try again."
    action={<Button variant="pill" title="Try Again" icon="refresh" onPress={() => void days.refetch()} />} />
    : entries.length === 0 && mode === "list" ? <EmptyState title={firstUse ? "Log your first day" : "No days this season"}
      description={firstUse ? "Each day you ski becomes an entry with the resort, your skis, tags, notes and photos." : `Nothing was logged between ${range.label}.`}
      action={firstUse ? <Button title="Log a Day" icon="plus" onPress={() => log()} style={{ borderRadius: 24 }} /> : undefined} /> : null;
  return <View style={styles.screen}>
    <SeasonHeader value={season} onChange={setSeason} right={<IconSegmented value={mode} onChange={setMode} />} />
    <View style={{ paddingHorizontal: 16, paddingTop: 4 }}><SyncNotice /></View>
    {mode === "list" ? <SectionList ref={listRef} sections={journalSections(entries)}
      keyExtractor={(day) => day.id} stickySectionHeadersEnabled refreshControl={refreshControl}
      contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 + insets.bottom }}
      ListHeaderComponent={days.error && days.data ? <View style={{ padding: 16 }}><Notice message="Couldn't refresh your days. Your last loaded entries are still here." onRetry={() => void days.refetch()} /></View> : undefined}
      ListEmptyComponent={feedback} ItemSeparatorComponent={JournalSeparator}
      renderSectionHeader={({ section }) => <View style={styles.monthHeader}>
        <Text variant="headline">{section.title}</Text>
        <Text variant="label" style={{ color: colors.textSecondary }}>{section.data.length} {section.data.length === 1 ? "day" : "days"}</Text>
      </View>}
      renderItem={({ item }) => <JournalRow day={item} onPress={() => openDay(item)} onLongPress={() => actions(item)} />}
    /> : <ScrollView ref={calendarRef} refreshControl={refreshControl} contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 + insets.bottom }}>
      {firstLoad || failed ? feedback : <>
        {days.error && <View style={{ padding: 16 }}><Notice message="Couldn't refresh your days. Your last loaded entries are still here." onRetry={() => void days.refetch()} /></View>}
        <View style={{ paddingHorizontal: 12, paddingTop: 10, paddingBottom: 6 }}>
          <Calendar month={month} selected={selected} loggedDates={entries.map((day) => day.date)} weekStartsOn={localeWeekStart()}
            minDate={minDate} maxDate={maxDate}
            onMonthChange={(value) => setSelection({ season, date: selected, month: value })}
            onSelect={(value) => setSelection({ season, date: value, month: monthStart(value) })} />
        </View>
        <View style={styles.band} />
        <View style={styles.selectedHeader}>
          <Text variant="headline">{selectedDateTitle(selected)}</Text>
          <Text variant="label" style={{ color: colors.textSecondary }}>{selectedDays.length} {selectedDays.length === 1 ? "day" : "days"}</Text>
        </View>
        {selectedDays.map((day) => <JournalRow key={day.id} day={day} calendar onPress={() => openDay(day)} onLongPress={() => actions(day)} />)}
        {selectedDays.length === 0 && <View style={styles.noDate}>
          <Text variant="callout" style={{ color: colors.textSecondary }}>No days logged on this date.</Text>
          <Button variant="pill" icon="plus" title={"Log a day on " + parseDay(selected).toLocaleDateString(undefined, { month: "short", day: "numeric" })} onPress={() => log(selected)} />
        </View>}
      </>}
    </ScrollView>}
    {<Pressable accessibilityRole="button" accessibilityLabel="Log Day" onPress={() => log()}
      style={({ pressed }) => [styles.fab, { bottom: 16, opacity: pressed ? 0.7 : 1 }]}>
      <LinearGradient colors={colors.primaryGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.fabFill}>
        <Icon name="plus" color={colors.canvas} size={20} strokeWidth={2.25} />
        <Text variant="bodyMedium" style={{ color: colors.canvas, fontFamily: "SpaceGrotesk_700Bold" }}>Log Day</Text>
      </LinearGradient>
    </Pressable>}
  </View>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  monthHeader: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6, flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.stickyHeaderBg },
  skeletonRow: { paddingHorizontal: 16, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 14 },
  selectedHeader: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 6, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  band: { height: 8, backgroundColor: colors.surfaceSubtle, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.divider },
  noDate: { margin: 16, borderWidth: 1, borderStyle: "dashed", borderColor: colors.borderStrong, borderRadius: 14, padding: 20, alignItems: "center", gap: 14 },
  fab: { position: "absolute", right: 16, borderRadius: 26, ...shadow.fab },
  fabFill: { minHeight: 52, paddingLeft: 16, paddingRight: 20, borderRadius: 26, flexDirection: "row", alignItems: "center", gap: 8 },
});
