import { useRef, useState } from "react";
import { RefreshControl, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { useQuery } from "@tanstack/react-query";
import { shred } from "../../services/shred";
import {
  Button,
  Card,
  colors,
  Heading,
  Notice,
  Screen,
  styles,
  Text,
} from "../../components/ui";
import { SeasonPicker } from "../../components/season-picker";

export default function StatsScreen() {
  const [season, setSeason] = useState(0);
  const map = useRef<MapView>(null);
  const query = useQuery({
    queryKey: ["stats", season],
    queryFn: () => shred.stats(season),
  });
  const stats = query.data;
  const mapped =
    stats?.resorts.filter((r) => r.latitude != null && r.longitude != null) ||
    [];
  return (
    <Screen
      refreshControl={
        <RefreshControl
          refreshing={query.isRefetching}
          onRefresh={() => void query.refetch()}
        />
      }
    >
      <Heading
        title="Your season,\nin perspective."
        subtitle="Every day adds up."
      />
      <SeasonPicker value={season} onChange={setSeason} />
      {query.isPending && <Text>Loading your season…</Text>}
      {query.error && (
        <Notice error={query.error} onRetry={() => void query.refetch()} />
      )}
      {stats && (
        <>
          <Card style={{ backgroundColor: colors.alpine }}>
            <Text style={styles.eyebrow}>DAYS ON SNOW</Text>
            <Text
              style={{
                fontFamily: "SpaceGrotesk_700Bold",
                fontSize: 84,
                lineHeight: 92,
              }}
            >
              {stats.summary.totalDays}
            </Text>
            <View style={styles.row}>
              <Text>{stats.summary.uniqueResorts} resorts</Text>
              <Text>↗ {stats.summary.longestStreak} day streak</Text>
            </View>
          </Card>
          {stats.summary.totalDays === 0 && (
            <Card>
              <Text>Log your first day to start your season story.</Text>
            </Card>
          )}
          {stats.daysPerMonth.length > 0 && (
            <Card>
              <Text
                accessibilityRole="header"
                style={{ fontFamily: "SpaceGrotesk_700Bold" }}
              >
                The rhythm of your season
              </Text>
              {stats.daysPerMonth.map((month) => (
                <View key={month.month} style={{ gap: 5 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                    }}
                  >
                    <Text>{month.month}</Text>
                    <Text>{month.days}</Text>
                  </View>
                  <View
                    style={{
                      height: 10,
                      backgroundColor: colors.paper,
                      borderRadius: 6,
                    }}
                  >
                    <View
                      style={{
                        height: 10,
                        borderRadius: 6,
                        width: `${(month.days / Math.max(...stats.daysPerMonth.map((m) => m.days))) * 100}%`,
                        backgroundColor: colors.accent,
                      }}
                    />
                  </View>
                </View>
              ))}
            </Card>
          )}
          {mapped.length > 0 && (
            <Card style={{ padding: 0, overflow: "hidden" }}>
              <MapView
                key={season}
                accessibilityLabel="Resorts skied this season"
                style={{ height: 280 }}
                initialRegion={{
                  latitude: Number(mapped[0].latitude),
                  longitude: Number(mapped[0].longitude),
                  latitudeDelta: 2,
                  longitudeDelta: 2,
                }}
                ref={map}
                onMapReady={() =>
                  map.current?.fitToCoordinates(
                    mapped.map((r) => ({
                      latitude: Number(r.latitude),
                      longitude: Number(r.longitude),
                    })),
                    {
                      edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
                      animated: false,
                    },
                  )
                }
              >
                {mapped.map((r) => (
                  <Marker
                    key={r.name}
                    coordinate={{
                      latitude: Number(r.latitude),
                      longitude: Number(r.longitude),
                    }}
                    title={r.name}
                    description={`${r.daysSkied} days`}
                    pinColor={colors.accent}
                  />
                ))}
              </MapView>
            </Card>
          )}
          {stats.resorts.length > 0 && (
            <Breakdown
              title="Places you keep coming back to"
              rows={stats.resorts.map((r) => ({
                name: r.name,
                count: r.daysSkied,
              }))}
            />
          )}
          {stats.skis.length > 0 && (
            <Breakdown
              title="Your quiver in action"
              rows={stats.skis.map((s) => ({ name: s.name, count: s.days }))}
            />
          )}
          {stats.tags.length > 0 && (
            <Breakdown title="How you spent your days" rows={stats.tags} />
          )}
          {query.isError && (
            <Button
              title="Reload season"
              onPress={() => void query.refetch()}
            />
          )}
        </>
      )}
    </Screen>
  );
}
function Breakdown({
  title,
  rows,
}: {
  title: string;
  rows: { name: string; count: number }[];
}) {
  return (
    <Card>
      <Text
        accessibilityRole="header"
        style={{ fontFamily: "SpaceGrotesk_700Bold" }}
      >
        {title}
      </Text>
      {rows.map((row) => (
        <View
          key={row.name}
          style={{ flexDirection: "row", justifyContent: "space-between" }}
        >
          <Text style={{ flex: 1 }}>{row.name}</Text>
          <Text>{row.count}</Text>
        </View>
      ))}
    </Card>
  );
}
