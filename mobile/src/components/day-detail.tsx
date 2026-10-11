import { useState } from "react";
import { Alert, ScrollView, Share, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { shred } from "../services/shred";
import { displayDate } from "../lib/dates";
import {
  Button,
  Card,
  colors,
  Heading,
  Notice,
  Screen,
  styles,
  Text,
} from "./ui";

export function DayDetail({
  id,
  shared = false,
}: {
  id: string;
  shared?: boolean;
}) {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: [shared ? "shared-day" : "day", id],
    queryFn: () => (shared ? shred.sharedDay(id) : shred.day(id)),
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const day = query.data;
  const run = async (operation: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await operation();
      await client.invalidateQueries();
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  };
  const share = () => {
    const publish = () =>
      run(async () => {
        await shred.shareDay(id);
        const result = await Share.share({
          url: "https://shred.day/d/" + id,
          message: "A day on snow · Shred.Day",
        });
        if (!day?.shared_at && result.action === Share.dismissedAction)
          await shred.unshareDay(id);
      });
    if (day?.shared_at) {
      void publish();
      return;
    }
    Alert.alert(
      "Create a public link?",
      "Anyone with the link can see this day's notes, photos and photo locations. You can stop sharing from this screen.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Create & share", onPress: () => void publish() },
      ],
    );
  };
  const remove = () =>
    Alert.alert(
      "Delete this day?",
      "Your notes and attached photos will be removed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () =>
            void run(async () => {
              await shred.deleteDay(id);
              router.replace("/");
            }),
        },
      ],
    );
  return (
    <Screen>
      <Button
        secondary
        title="← Back"
        onPress={() =>
          router.canGoBack() ? router.back() : router.replace("/")
        }
      />
      {query.isPending && <Text>Loading this day…</Text>}
      {query.error && (
        <Notice error={query.error} onRetry={() => void query.refetch()} />
      )}
      {day && (
        <>
          <Heading title={day.resort.name} subtitle={displayDate(day.date)} />
          <Card style={{ backgroundColor: colors.alpine }}>
            <Text style={styles.eyebrow}>DAY {day.day_number}</Text>
            <Text>
              {day.skis.map((s) => s.name).join(" / ") || "A day on snow"}
            </Text>
            <View style={styles.row}>
              {day.tags.map((tag) => (
                <Text key={tag.id} style={{ fontSize: 14 }}>
                  {tag.name}
                </Text>
              ))}
            </View>
          </Card>
          {day.notes && (
            <Card>
              <Text>{day.notes}</Text>
            </Card>
          )}
          {day.photos.length > 0 && (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12 }}
            >
              {day.photos.map((photo) => (
                <View
                  key={photo.id}
                  style={{
                    width: 300,
                    height: 360,
                    borderRadius: 20,
                    overflow: "hidden",
                    backgroundColor: colors.alpine,
                  }}
                >
                  {photo.full_url ? (
                    <Image
                      accessibilityLabel={
                        photo.filename || "Photo from this day"
                      }
                      source={photo.full_url}
                      style={{ flex: 1 }}
                      contentFit="cover"
                    />
                  ) : (
                    <Text>Photo processing…</Text>
                  )}
                </View>
              ))}
            </ScrollView>
          )}
          {!shared && (
            <>
              <Button
                title="Edit day"
                onPress={() =>
                  router.push({ pathname: "/log/[id]", params: { id } })
                }
              />
              <Button
                secondary
                title={day.shared_at ? "Share link again" : "Share day"}
                busy={busy}
                onPress={share}
              />
              {day.shared_at && (
                <Button
                  secondary
                  title="Stop sharing"
                  disabled={busy}
                  onPress={() => void run(() => shred.unshareDay(id))}
                />
              )}
              <Button
                destructive
                title="Delete day"
                busy={busy}
                onPress={remove}
              />
            </>
          )}
          {shared && (
            <Card>
              <Text>This day was shared on Shred.Day.</Text>
              <Button
                title="Your own season starts here"
                onPress={() => router.replace("/")}
              />
            </Card>
          )}
        </>
      )}
      {Boolean(error) && <Notice error={error} />}
    </Screen>
  );
}
