import { useEffect, useRef, useState } from "react";
import { Alert, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { shred } from "../services/shred";
import { dateString, parseDay } from "../lib/dates";
import type { Resort } from "../lib/types";
import { useAuth } from "../contexts/auth";
import { useDayPhotos } from "../hooks/use-day-photos";
import {
  Button,
  Card,
  colors,
  Field,
  Heading,
  Notice,
  Pill,
  Screen,
  styles,
  Text,
} from "./ui";

export function DayEditor({ id }: { id?: string }) {
  const client = useQueryClient();
  const auth = useAuth();
  const existing = useQuery({
    queryKey: ["day", id],
    queryFn: () => shred.day(id!),
    enabled: Boolean(id),
  });
  const skis = useQuery({ queryKey: ["skis"], queryFn: shred.skis });
  const tags = useQuery({ queryKey: ["tags"], queryFn: shred.tags });
  const recent = useQuery({
    queryKey: ["recent-resorts"],
    queryFn: shred.recentResorts,
  });
  const [date, setDate] = useState(dateString(new Date()));
  const [resort, setResort] = useState<Resort | null>(null);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const results = useQuery({
    queryKey: ["resorts", debounced],
    queryFn: ({ signal }) => shred.resorts(debounced, signal),
    enabled: debounced.trim().length >= 2,
  });
  const [skiIds, setSkiIds] = useState<string[]>([]);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [country, setCountry] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const photoState = useDayPhotos();
  const loaded = useRef(false);
  const dirty = useRef(false);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    if (existing.data && !loaded.current) {
      const day = existing.data;
      setDate(day.date);
      setResort(day.resort);
      setSkiIds(day.skis.map((s) => s.id));
      setTagIds(day.tags.map((t) => t.id));
      setNotes(day.notes || "");
      photoState.load(day.photos);
      loaded.current = true;
    }
  }, [existing.data, photoState]);
  const toggle = (
    id: string,
    list: string[],
    update: (value: string[]) => void,
  ) => {
    dirty.current = true;
    update(list.includes(id) ? list.filter((v) => v !== id) : [...list, id]);
  };
  const leave = () => {
    if (
      !dirty.current &&
      photoState.photos.length === (existing.data?.photos.length || 0)
    ) {
      router.back();
      return;
    }
    Alert.alert(
      "Discard this day?",
      "Unsaved edits and new photos will be discarded.",
      [
        { text: "Keep editing", style: "cancel" },
        { text: "Discard", style: "destructive", onPress: () => router.back() },
      ],
    );
  };
  const save = async () => {
    if (!resort || photoState.pending || busy) return;
    setBusy(true);
    setError(null);
    try {
      const day = await shred.saveDay(
        {
          date,
          resort_id: resort.id,
          ski_ids: skiIds,
          tag_ids: tagIds,
          notes: notes.trim() || null,
          photo_ids: photoState.photos.flatMap((p) => (p.id ? [p.id] : [])),
        },
        id,
      );
      photoState.commit();
      client.setQueryData(["day", day.id], day);
      void client.invalidateQueries();
      void auth.refresh().catch(() => {});
      router.replace({ pathname: "/day/[id]", params: { id: day.id } });
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  };
  const suggest = async () => {
    setBusy(true);
    setError(null);
    try {
      const created = await shred.suggestResort(search.trim(), country.trim());
      setResort(created);
      dirty.current = true;
      setSuggesting(false);
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  };
  if (id && existing.isPending)
    return (
      <Screen>
        <Text>Loading your day…</Text>
      </Screen>
    );
  if (id && existing.isError)
    return (
      <Screen>
        <Button title="← Back" onPress={() => router.back()} />
        <Notice
          error={existing.error}
          onRetry={() => void existing.refetch()}
        />
      </Screen>
    );
  return (
    <Screen>
      <Button secondary title="← Cancel" disabled={busy} onPress={leave} />
      <Heading
        title={id ? "Remember it\nyour way." : "Another day\nworth keeping."}
      />
      <Card>
        <Text accessibilityRole="header">Date</Text>
        <DateTimePicker
          value={parseDay(date)}
          mode="date"
          display="compact"
          onChange={(_, value) => {
            if (value) {
              setDate(dateString(value));
              dirty.current = true;
            }
          }}
        />
      </Card>
      <Card>
        <Text accessibilityRole="header">Resort</Text>
        {resort && (
          <Pill
            selected
            title={resort.name + (resort.country ? " · " + resort.country : "")}
            onPress={() => {
              setResort(null);
              dirty.current = true;
            }}
          />
        )}
        <Field
          label="Find a resort"
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name"
          autoCorrect={false}
        />
        {results.isFetching && <Text>Searching…</Text>}
        {results.error && (
          <Notice
            error={results.error}
            onRetry={() => void results.refetch()}
          />
        )}
        {(debounced.length >= 2 ? results.data : recent.data)?.map((item) => (
          <Pill
            key={item.id}
            title={item.name + (item.country ? " · " + item.country : "")}
            selected={resort?.id === item.id}
            onPress={() => {
              setResort(item);
              setSearch("");
              dirty.current = true;
            }}
          />
        ))}
        {recent.error && !debounced && <Notice error={recent.error} />}
        {search.trim().length >= 2 && (
          <Button
            secondary
            title="Suggest this resort"
            onPress={() => setSuggesting(true)}
          />
        )}
        {suggesting && (
          <>
            <Field
              label="Country"
              value={country}
              onChangeText={setCountry}
              placeholder="Austria"
            />
            <Button
              title={"Add " + search.trim()}
              disabled={!country.trim()}
              busy={busy}
              onPress={() => void suggest()}
            />
          </>
        )}
      </Card>
      <Card>
        <Text accessibilityRole="header">Skis</Text>
        {skis.isPending && <Text>Loading skis…</Text>}
        {skis.error && (
          <Notice error={skis.error} onRetry={() => void skis.refetch()} />
        )}
        <View style={styles.row}>
          {skis.data?.map((ski) => (
            <Pill
              key={ski.id}
              title={ski.name}
              selected={skiIds.includes(ski.id)}
              onPress={() => toggle(ski.id, skiIds, setSkiIds)}
            />
          ))}
        </View>
        {skis.data?.length === 0 && (
          <Text>Add your skis in Gear, or log this day without them.</Text>
        )}
        <Button
          secondary
          title="Manage gear & tags"
          onPress={() => router.push("/gear")}
        />
      </Card>
      <Card>
        <Text accessibilityRole="header">Kind of day</Text>
        {tags.error && (
          <Notice error={tags.error} onRetry={() => void tags.refetch()} />
        )}
        <View style={styles.row}>
          {tags.data?.map((tag) => (
            <Pill
              key={tag.id}
              title={tag.name}
              selected={tagIds.includes(tag.id)}
              onPress={() => toggle(tag.id, tagIds, setTagIds)}
            />
          ))}
        </View>
      </Card>
      <Field
        label={"Notes · " + notes.length + "/500"}
        value={notes}
        onChangeText={(value) => {
          setNotes(value);
          dirty.current = true;
        }}
        multiline
        maxLength={500}
        style={{ minHeight: 140, textAlignVertical: "top" }}
        placeholder="Snow, people, little moments…"
      />
      <Card>
        <Text accessibilityRole="header">Photos</Text>
        <View style={styles.row}>
          <Button
            secondary
            title="Photo library"
            disabled={busy}
            onPress={() => void photoState.pick(false)}
          />
          <Button
            secondary
            title="Camera"
            disabled={busy}
            onPress={() => void photoState.pick(true)}
          />
        </View>
        {photoState.photos.map((photo) => (
          <View key={photo.key} style={{ gap: 8 }}>
            {photo.uri && (
              <Image
                source={photo.uri}
                style={{
                  width: "100%",
                  height: 220,
                  borderRadius: 14,
                  backgroundColor: colors.alpine,
                }}
                contentFit="cover"
                accessibilityLabel="Selected photo"
              />
            )}
            {photo.status === "uploading" && <Text>Uploading photo…</Text>}
            {photo.error && <Text style={styles.error}>{photo.error}</Text>}
            <View style={styles.row}>
              {photo.status === "failed" && (
                <Button
                  secondary
                  title="Retry upload"
                  onPress={() => void photoState.retry(photo)}
                />
              )}
              <Button
                secondary
                disabled={busy}
                title="Remove photo"
                onPress={() => {
                  photoState.remove(photo);
                  dirty.current = true;
                }}
              />
            </View>
          </View>
        ))}
        {Boolean(photoState.error) && (
          <>
            <Notice error={photoState.error} />
            <Button
              secondary
              title="Open iPhone Settings"
              onPress={() => void photoState.openSettings()}
            />
          </>
        )}
      </Card>
      {Boolean(error) && <Notice error={error} />}
      <Button
        title={
          photoState.pending
            ? "Finish photo uploads to save"
            : id
              ? "Save changes"
              : "Log this day"
        }
        busy={busy}
        disabled={!resort || photoState.pending}
        onPress={() => void save()}
      />
    </Screen>
  );
}
