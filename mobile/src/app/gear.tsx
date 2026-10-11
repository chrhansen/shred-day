import { useState } from "react";
import { Alert, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { shred } from "../services/shred";
import {
  Button,
  Card,
  Field,
  Heading,
  Notice,
  Screen,
  styles,
  Text,
} from "../components/ui";

export default function GearScreen() {
  return (
    <Screen>
      <Button secondary title="← Back" onPress={() => router.back()} />
      <Heading title="Your gear.\nYour kind of day." />
      <Collection kind="skis" />
      <Collection kind="tags" />
    </Screen>
  );
}
function Collection({ kind }: { kind: "skis" | "tags" }) {
  const client = useQueryClient();
  const query = useQuery({ queryKey: [kind], queryFn: shred[kind] });
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const run = async (operation: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await operation();
      setName("");
      await client.invalidateQueries();
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  };
  const remove = (id: string, title: string) =>
    Alert.alert(
      "Delete " + title + "?",
      "This removes it from your logged days too.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => void run(() => shred.deleteNamed(kind, id)),
        },
      ],
    );
  return (
    <Card>
      <Text
        accessibilityRole="header"
        style={{ fontFamily: "SpaceGrotesk_700Bold", fontSize: 24 }}
      >
        {kind === "skis" ? "Skis" : "Tags"}
      </Text>
      {query.error && (
        <Notice error={query.error} onRetry={() => void query.refetch()} />
      )}
      {query.isPending && <Text>Loading…</Text>}
      {query.data?.map((item) => (
        <View key={item.id} style={{ gap: 8 }}>
          <Text>{item.name}</Text>
          <View style={styles.row}>
            {kind === "skis" && (
              <Button
                secondary
                disabled={busy}
                title="Rename"
                onPress={() =>
                  Alert.prompt(
                    "Rename ski",
                    undefined,
                    (value) => {
                      if (value.trim())
                        void run(() => shred.renameSki(item.id, value.trim()));
                    },
                    "plain-text",
                    item.name,
                  )
                }
              />
            )}
            <Button
              secondary
              disabled={busy}
              title="Delete"
              onPress={() => remove(item.id, item.name)}
            />
          </View>
        </View>
      ))}
      <Field
        label={kind === "skis" ? "New ski" : "New tag"}
        value={name}
        onChangeText={setName}
        maxLength={100}
      />
      <Button
        title="Add"
        busy={busy}
        disabled={!name.trim()}
        onPress={() => void run(() => shred.createNamed(kind, name.trim()))}
      />
      {Boolean(error) && <Notice error={error} />}
    </Card>
  );
}
