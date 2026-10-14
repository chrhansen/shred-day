import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../contexts/auth";
import { shred } from "../../services/shred";
import type { Resort } from "../../lib/types";
import { colors } from "../../theme";
import { Button, Field, Icon, Notice, Text } from "../ui";
import { BottomSheet } from "../ui/sheet";
import { useToast } from "../ui/toast";

type ResortSheetProps = {
  visible: boolean; selected: Resort | null; onClose: () => void; onSelect: (resort: Resort) => void;
};
export function ResortSheet(props: ResortSheetProps) {
  return props.visible ? <ResortSheetContent {...props} /> : null;
}
function ResortSheetContent({ visible, selected, onClose, onSelect }: ResortSheetProps) {
  const { user } = useAuth();
  const client = useQueryClient();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const submitting = useRef(false);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);
  const recent = useQuery({ queryKey: ["recent-resorts", user?.id], queryFn: shred.recentResorts, enabled: visible });
  const results = useQuery({ queryKey: ["resorts", user?.id, debounced],
    queryFn: ({ signal }) => shred.resorts(debounced, signal), enabled: visible && debounced.length >= 2 });
  const typing = search.trim() !== debounced;
  const searching = typing || (debounced.length >= 2 && results.isFetching);
  const source = search.trim() ? results : recent;
  const rows = !searching && (!search.trim() || debounced.length >= 2) ? source.data || [] : [];
  const showSuggestion = () => { setName(search.trim()); setFailed(false); setSuggesting(true); };
  const select = (resort: Resort) => { onSelect(resort); onClose(); };
  const suggest = async () => {
    if (!name.trim() || !country.trim() || submitting.current) return;
    submitting.current = true;
    setBusy(true); setFailed(false);
    try {
      const resort = await shred.suggestResort(name.trim(), country.trim());
      select(resort); toast("Resort suggested and selected");
      void client.invalidateQueries({ queryKey: ["resorts", user?.id] }).catch(() => {});
    } catch { setFailed(true); }
    finally { submitting.current = false; setBusy(false); }
  };
  return <BottomSheet visible={visible} title="Resort"
    height="large" dismissible={!busy} cancelLabel="Cancel" onClose={onClose}>
    {suggesting ? <View style={{ gap: 20 }}>
      <Text variant="sheetTitle" accessibilityRole="header">Suggest a resort</Text>
      <Text variant="body" style={{ color: colors.textSecondary }}>{"Add its name and country. It's saved with this day and sent for review."}</Text>
      <Field label="Resort name" value={name} onChangeText={setName} editable={!busy} autoFocus maxLength={120} />
      <Field label="Country" placeholder="e.g. Austria" value={country} onChangeText={setCountry} editable={!busy}
        maxLength={80} returnKeyType="done" onSubmitEditing={() => void suggest()} />
      {failed && <Notice error={new Error("Couldn't suggest this resort. Check the name and country, then try again.")} />}
      <Button title={busy ? "Suggesting…" : "Suggest and Use"} busy={busy} disabled={!name.trim() || !country.trim()} onPress={() => void suggest()} />
      <Button variant="text" title="Back to search" disabled={busy} onPress={() => setSuggesting(false)} />
    </View> : <View style={{ gap: 16 }}>
      <Field label="Search resorts" hideLabel value={search} onChangeText={setSearch} placeholder="Search resorts" icon="search"
        autoFocus returnKeyType="search" autoCorrect={false} maxLength={120} />
      <Text variant="caption" style={{ color: colors.textSecondary }}>{search.trim() ? "Results" : "Your resorts"}</Text>
      {searching || (!search.trim() && recent.isPending) ? <View style={sheetStyles.loading}>
        <ActivityIndicator color={colors.primary} /><Text style={{ color: colors.textSecondary }}>Searching…</Text>
      </View> : source.isError ? <View style={sheetStyles.empty}>
        <Icon name="wifi-off" size={28} color={colors.textSecondary} />
        <Text variant="headline">{"Couldn't search resorts"}</Text>
        <Text style={{ color: colors.textSecondary }}>Check your connection and try again.</Text>
        <Button title="Try Again" variant="pill" onPress={() => void source.refetch()} />
      </View> : <>
        {rows.map((resort) => <Pressable key={resort.id} accessibilityRole="button"
          accessibilityLabel={[resort.name, resort.region, resort.country].filter(Boolean).join(", ")}
          accessibilityState={{ selected: resort.id === selected?.id }} onPress={() => select(resort)} style={sheetStyles.row}>
          <Icon name={search.trim() ? "pin" : "clock"} size={18} color={colors.textMuted} />
          <View style={{ flex: 1, gap: 2 }}><Text variant="bodyMedium">{resort.name}</Text>
            <Text variant="caption" style={{ color: colors.textSecondary }}>{[resort.region, resort.country].filter(Boolean).join(", ")}</Text>
          </View>
          {resort.id === selected?.id && <Icon name="check" size={18} color={colors.primary} />}
        </Pressable>)}
        {debounced.length >= 2 && rows.length === 0 && <View style={sheetStyles.empty}>
          <Text variant="headline">No resorts match &quot;{debounced}&quot;</Text>
          <Text style={{ color: colors.textSecondary }}>{"Check the spelling, or suggest it if it's missing."}</Text>
        </View>}
        {search.trim().length === 1 && <Text variant="caption" style={{ color: colors.textSecondary }}>Type at least two characters to search.</Text>}
        <Button title={rows.length || !search.trim() ? "Not listed? Suggest a resort" : `Suggest "${search.trim()}"`}
          variant="pill" icon="plus" onPress={showSuggestion} />
      </>}
    </View>}
  </BottomSheet>;
}
const sheetStyles = StyleSheet.create({
  loading: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 24 },
  empty: { paddingVertical: 24, alignItems: "center", gap: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 64, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
});
