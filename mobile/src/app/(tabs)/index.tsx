import { useState } from "react";
import { Pressable, RefreshControl, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Image } from "expo-image";
import { shred } from "../../services/shred";
import { dateString, displayDate, parseDay } from "../../lib/dates";
import {
  Button,
  Card,
  Heading,
  Notice,
  Pill,
  Screen,
  Text,
  colors,
  styles,
} from "../../components/ui";
import { SeasonPicker } from "../../components/season-picker";
export default function DaysScreen() {
  const [season, setSeason] = useState(0);
  const [calendar, setCalendar] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const days = useQuery({
    queryKey: ["days", season],
    queryFn: () => shred.days(season),
  });
  const visible = selected
    ? days.data?.filter((day) => day.date === selected)
    : days.data;
  const months = [
    ...new Set(days.data?.map((day) => day.date.slice(0, 7)) || []),
  ];
  return (
    <Screen
      refreshControl={
        <RefreshControl
          refreshing={days.isRefetching}
          onRefresh={() => void days.refetch()}
        />
      }
    >
      <Heading
        title="Good days,
kept forever."
        subtitle={(days.data?.length || 0) + " entries in your season"}
      />
      <Button title="+ Log a ski day" onPress={() => router.push("/log")} />
      <SeasonPicker
        value={season}
        onChange={(value) => {
          setSeason(value);
          setSelected(null);
        }}
      />
      <View style={styles.row}>
        <Pill
          title="List"
          selected={!calendar}
          onPress={() => {
            setCalendar(false);
            setSelected(null);
          }}
        />
        <Pill
          title="Calendar"
          selected={calendar}
          onPress={() => setCalendar(true)}
        />
        {selected && (
          <Pill title="All days" onPress={() => setSelected(null)} />
        )}
      </View>
      {days.error && (
        <Notice error={days.error} onRetry={() => void days.refetch()} />
      )}
      {days.isPending && <Text>Loading your days…</Text>}
      {calendar &&
        months.map((month) => {
          const first = parseDay(month + "-01");
          const count = new Date(
            first.getFullYear(),
            first.getMonth() + 1,
            0,
          ).getDate();
          const blanks = (first.getDay() + 6) % 7;
          const dates = new Set(days.data?.map((day) => day.date));
          return (
            <Card key={month}>
              <Text
                accessibilityRole="header"
                style={{ fontFamily: "SpaceGrotesk_700Bold" }}
              >
                {first.toLocaleDateString(undefined, {
                  month: "long",
                  year: "numeric",
                })}
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {["M", "T", "W", "T", "F", "S", "S"].map((label, index) => (
                  <Text
                    key={index}
                    style={{
                      width: "14.28%",
                      textAlign: "center",
                      color: colors.muted,
                    }}
                  >
                    {label}
                  </Text>
                ))}
                {Array.from({ length: blanks }, (_, index) => (
                  <View
                    key={"blank" + index}
                    style={{ width: "14.28%", height: 46 }}
                  />
                ))}
                {Array.from({ length: count }, (_, index) => {
                  const value = dateString(
                    new Date(first.getFullYear(), first.getMonth(), index + 1),
                  );
                  const logged = dates.has(value);
                  return (
                    <Pressable
                      key={value}
                      accessibilityRole="button"
                      accessibilityLabel={
                        displayDate(value) +
                        (logged ? ", ski day" : ", no entry")
                      }
                      disabled={!logged}
                      onPress={() => setSelected(value)}
                      style={{
                        width: "14.28%",
                        height: 46,
                        justifyContent: "center",
                        borderRadius: 12,
                        backgroundColor:
                          selected === value ? colors.alpine : undefined,
                      }}
                    >
                      <Text
                        style={{
                          textAlign: "center",
                          color: logged ? colors.accent : colors.muted,
                          fontFamily: logged
                            ? "SpaceGrotesk_700Bold"
                            : "SpaceGrotesk_400Regular",
                        }}
                      >
                        {index + 1}
                        {logged ? "•" : ""}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Card>
          );
        })}
      {visible?.map((day) => (
        <Pressable
          key={day.id}
          accessibilityRole="button"
          onPress={() =>
            router.push({ pathname: "/day/[id]", params: { id: day.id } })
          }
        >
          <Card>
            <View style={styles.row}>
              <Text style={[styles.eyebrow, { flex: 1 }]}>
                {displayDate(day.date)}
              </Text>
              <Text style={{ color: colors.muted }}>#{day.day_number}</Text>
            </View>
            <Text
              style={{
                fontFamily: "SpaceGrotesk_700Bold",
                fontSize: 24,
                lineHeight: 30,
              }}
            >
              {day.resort_name}
            </Text>
            <Text style={styles.muted}>
              {[...day.ski_names, ...day.tag_names].join(" · ")}
            </Text>
            {day.notes && <Text numberOfLines={2}>{day.notes}</Text>}
            {day.photos?.[0]?.preview_url && (
              <Image
                source={day.photos[0].preview_url}
                style={{ height: 140, borderRadius: 12 }}
                contentFit="cover"
              />
            )}
          </Card>
        </Pressable>
      ))}
      {!days.isPending && !days.error && visible?.length === 0 && (
        <Card>
          <Text>No ski days here yet. Start with a day worth remembering.</Text>
        </Card>
      )}
    </Screen>
  );
}
