import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { shred } from "../services/shred";
import { useAuth } from "../contexts/auth";
import { ApiError } from "../lib/api";
import { parseDay, seasonLabel } from "../lib/dates";
import { detailDate } from "../lib/journal";
import type { Day } from "../lib/types";
import { Button, colors, EmptyState, Icon, IconButton, Notice, Screen, shadow, SkiChip, TagPill, Text } from "./ui";
import { seasonDateRange } from "./season-picker";
import { DayGallery } from "./day-gallery";
import { DayShareSheet } from "./day-share-sheet";
import { PhotoViewer } from "./photo-viewer";
import { showDayActions, useDayActions } from "../hooks/use-day-actions";

type ReadableDay = Day & { user?: { username: string | null; avatar_url?: string | null } };
export function DayDetail({ id, shared = false, openSharing = false }: { id: string; shared?: boolean; openSharing?: boolean }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const query = useQuery<ReadableDay>({ queryKey: shared ? ["shared-day", id] : ["day", id, user?.id],
    queryFn: () => shared ? shred.sharedDay(id) : shred.day(id), enabled: Boolean(id && (shared || user)) });
  const [sharingOpen, setSharingOpen] = useState(openSharing);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [overPhoto, setOverPhoto] = useState(true);
  const { remove, deleting } = useDayActions();
  const day = query.data;
  const back = () => router.canGoBack() ? router.back() : router.replace("/");
  const edit = () => router.push({ pathname: "/log/[id]", params: { id } });
  const deleteDay = () => day && remove({ id, date: day.date, resort: day.resort.name, photos: day.photos.length }, () => router.dismissTo("/"));
  const actions = () => showDayActions({ share: () => setSharingOpen(true), edit, remove: deleteDay });
  const unavailable = shared && (!id || query.error instanceof ApiError && query.error.status === 404);
  const removed = !shared && query.error instanceof ApiError && query.error.status === 404;
  if (!day || unavailable || removed) return <Screen scroll={false} contentStyle={{ padding: 0 }}>
    <View style={styles.loadingBar}><IconButton name={shared ? "x" : "chevron-left"} accessibilityLabel={shared ? "Close public day" : "Back to journal"} onPress={back} /></View>
    {unavailable ? <EmptyState icon="link-off" title="This day isn't shared anymore"
      description="The owner stopped sharing it, or the link is incomplete."
      action={<Button variant="pill" title="Go to My Journal" onPress={() => router.replace("/")} />} />
      : removed ? <EmptyState icon="book" title="This day is no longer available"
        description="Return to your journal to see your latest days."
        action={<Button variant="pill" title="Go to My Journal" onPress={() => router.replace("/")} />} />
      : query.error || !id ? <EmptyState icon="wifi-off" title="Couldn't load this day"
        description="Check your connection and try again." action={<Button variant="pill" title="Try Again" onPress={() => void query.refetch()} />} />
        : <EmptyState title="Loading this day…" icon="mountain" />}
  </Screen>;
  const hasPhotos = day.photos.length > 0;
  const location = [day.resort.region, day.resort.country].filter(Boolean).join(", ");
  const start = seasonDateRange(0, user?.season_start_day || "09-01").start;
  const dayDate = parseDay(day.date);
  const candidate = new Date(dayDate.getFullYear(), start.getMonth(), start.getDate());
  const offset = candidate.getFullYear() - (dayDate < candidate ? 1 : 0) - start.getFullYear();
  const season = seasonLabel(offset).replace("season", "Season").replace(/^./, (letter) => letter.toUpperCase());
  const owner = day.user?.username;
  const initials = owner?.split(/[_. ]/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "SD";
  return <View style={styles.screen}>
    <StatusBar style={!shared && hasPhotos && overPhoto ? "light" : "dark"} />
    {shared && <View style={[styles.publicHeader, { paddingTop: insets.top, minHeight: insets.top + 52 }]}>
      <IconButton name="x" accessibilityLabel="Close public day" onPress={back} />
      <View style={styles.brand}><Image source={require("../../assets/logo.png")} style={{ width: 28, height: 28 }} contentFit="contain" /><Text variant="headline">Shred.Day</Text></View>
      <View style={{ width: 44 }} />
    </View>}
    <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 28, paddingTop: !shared && !hasPhotos ? insets.top + 52 : 0 }}
      scrollEventThrottle={32} onScroll={(event) => setOverPhoto(event.nativeEvent.contentOffset.y < 330)}>
      {hasPhotos && <DayGallery photos={day.photos} publicDay={shared} onOpen={setViewerIndex} />}
      <View style={styles.content}>
        {shared ? <View style={styles.ownerRow}>
          <View style={styles.avatar}>{day.user?.avatar_url ? <Image source={day.user.avatar_url} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Text variant="bodyMedium" style={{ color: colors.text600 }}>{initials}</Text>}</View>
          <View style={{ flex: 1, gap: 2 }}><Text variant="bodyMedium" style={{ fontFamily: "SpaceGrotesk_700Bold" }}>{owner ? "@" + owner : "Shred.Day skier"}</Text><Text variant="caption" style={{ color: colors.textSecondary }}>Shared a ski day</Text></View>
          <View style={styles.readOnly}><Icon name="eye" size={13} color={colors.text600} /><Text variant="small" style={{ color: colors.text600 }}>Read-only</Text></View>
        </View> : <View style={styles.meta}>
          <View style={styles.dayBadge}><Text variant="label" style={{ color: colors.dayBadgeText }}>Day {day.day_number}</Text></View>
          <Text variant="caption" style={{ color: colors.textSecondary }}>{season}</Text>
        </View>}
        <View style={{ gap: 10 }}>
          <Text variant={shared ? "titleL" : "titleXL"} accessibilityRole="header">{day.resort.name}{shared && day.resort.region ? ", " + day.resort.region : ""}</Text>
          <View style={styles.metadata}>
            <View style={styles.meta}><Icon name="calendar" size={16} color={colors.textSecondary} /><Text variant="callout" style={{ color: colors.textSecondary }}>{detailDate(day.date)}</Text></View>
            {!shared && location ? <View style={styles.meta}><Icon name="pin" size={16} color={colors.textSecondary} /><Text variant="callout" style={{ color: colors.textSecondary }}>{location}</Text></View> : null}
          </View>
        </View>
        {!shared && <View style={styles.divider} />}
        {shared ? <View style={styles.wrap}>{day.tags.map((tag) => <TagPill key={tag.id} title={tag.name} />)}{day.skis.map((ski) => <SkiChip key={ski.id} title={ski.name} />)}</View> : <>
          {day.skis.length > 0 && <View style={styles.section}><Text variant="label" style={styles.secondary}>Skis</Text><View style={styles.wrap}>{day.skis.map((ski) => <SkiChip key={ski.id} title={ski.name} />)}</View></View>}
          {day.tags.length > 0 && <View style={styles.section}><Text variant="label" style={styles.secondary}>Tags</Text><View style={styles.wrap}>{day.tags.map((tag) => <TagPill key={tag.id} title={tag.name} />)}</View></View>}
        </>}
        {day.notes ? <View style={styles.section}>{!shared && <Text variant="label" style={styles.secondary}>Notes</Text>}<Text variant="bodyL">{day.notes}</Text></View> : null}
        {!shared && !hasPhotos && <Pressable accessibilityRole="button" onPress={edit} style={styles.noPhotos}>
          <Icon name="image" size={22} color={colors.textSecondary} /><Text variant="callout" style={styles.secondary}>No photos for this day. Add some when you edit it.</Text>
        </Pressable>}
        {!shared && <Pressable accessibilityRole="button" accessibilityLabel={"Public link, " + (day.shared_at ? "on" : "off")}
          onPress={() => setSharingOpen(true)} style={styles.linkCard}>
          <View style={styles.linkIcon}><Icon name="link" size={20} /></View>
          <View style={{ flex: 1, gap: 3 }}><Text variant="bodyMedium" style={{ fontFamily: "SpaceGrotesk_700Bold" }}>Public link</Text>
            <Text variant="footnote" style={styles.secondary}>{day.shared_at ? "On · Anyone with the link can view" : "Off · Only you can see this day"}</Text>
          </View><Icon name="chevron-right" size={20} color={colors.textMuted} />
        </Pressable>}
        {query.error && <Notice message="Couldn't refresh this day. The last loaded entry is still here." onRetry={() => void query.refetch()} />}
        {shared && <View style={styles.publicFooter}><Text variant="footnote" style={[styles.secondary, { textAlign: "center" }]}>Track your own ski days and share your adventures</Text>
          <Button variant="dark" title="Start Logging Your Days" onPress={() => router.replace("/")} />
        </View>}
      </View>
    </ScrollView>
    {!shared && !hasPhotos && <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0,
      height: insets.top + 52, backgroundColor: colors.stickyHeaderBg, borderBottomWidth: 1, borderBottomColor: colors.divider }} />}
    {!shared && <View pointerEvents="box-none" style={[styles.controls, { top: insets.top + 4 }]}>
      <IconButton name="chevron-left" accessibilityLabel="Back to journal" onPress={back} style={styles.floating} size={24} />
      <View style={{ flex: 1 }} />
      <Pressable accessibilityRole="button" accessibilityLabel="Edit day" disabled={deleting} onPress={edit}
        style={({ pressed }) => [styles.edit, styles.floating, { opacity: pressed || deleting ? 0.6 : 1 }]}>
        <Icon name="pencil" size={16} /><Text variant="chip" style={{ fontFamily: "SpaceGrotesk_700Bold" }}>Edit</Text>
      </Pressable>
      <IconButton name="more" accessibilityLabel="Day actions" disabled={deleting} onPress={actions} style={styles.floating} size={24} />
    </View>}
    {!shared && <DayShareSheet day={day} visible={sharingOpen} onClose={() => setSharingOpen(false)} />}
    {viewerIndex !== null && <PhotoViewer photos={day.photos} initialIndex={viewerIndex} onClose={() => setViewerIndex(null)} />}
  </View>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  loadingBar: { minHeight: 52, paddingHorizontal: 12, justifyContent: "center" },
  content: { paddingTop: 20, paddingHorizontal: 20, gap: 22 },
  meta: { flexDirection: "row", alignItems: "center", gap: 8 },
  metadata: { flexDirection: "row", flexWrap: "wrap", columnGap: 14, rowGap: 4 },
  dayBadge: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, backgroundColor: colors.dayBadgeBg },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  section: { gap: 10 }, wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  secondary: { color: colors.textSecondary },
  noPhotos: { padding: 18, borderRadius: 14, borderStyle: "dashed", borderWidth: 1, borderColor: colors.borderStrong, gap: 12, alignItems: "center" },
  linkCard: { padding: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.border, flexDirection: "row", alignItems: "center", gap: 12 },
  linkIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.fill, alignItems: "center", justifyContent: "center" },
  controls: { position: "absolute", left: 12, right: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  floating: { backgroundColor: colors.floatingButtonBg, ...shadow.floating },
  edit: { minHeight: 44, borderRadius: 22, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 6 },
  publicHeader: { paddingHorizontal: 12, paddingBottom: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: colors.divider },
  brand: { flexDirection: "row", alignItems: "center", gap: 8 },
  ownerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.fill, justifyContent: "center", alignItems: "center", overflow: "hidden" },
  readOnly: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 13, backgroundColor: colors.fill },
  publicFooter: { paddingTop: 22, gap: 14, borderTopWidth: 1, borderTopColor: colors.border },
});
