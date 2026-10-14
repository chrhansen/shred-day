import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "./auth";

const SeasonContext = createContext({ season: 0, setSeason: (_value: number) => {} });
export function SeasonProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return <SeasonState key={user?.id ?? "signed-out"}>{children}</SeasonState>;
}
function SeasonState({ children }: { children: ReactNode }) {
  const [season, setSeason] = useState(0);
  const value = useMemo(() => ({ season, setSeason }), [season]);
  return <SeasonContext.Provider value={value}>{children}</SeasonContext.Provider>;
}
export const useSeason = () => useContext(SeasonContext);
