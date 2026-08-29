import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "./lib/api";
import type { FamilyStats, FamilySummary } from "./lib/types";

interface FamilyData extends FamilySummary {
  stats: FamilyStats;
}

interface ActiveFamilyCtx {
  familyId: string | null;
  family: FamilyData | null;
  families: FamilySummary[];
  loading: boolean;
  setFamilyId: (id: string) => void;
  refresh: () => Promise<void>;
}

const Ctx = createContext<ActiveFamilyCtx>({
  familyId: null,
  family: null,
  families: [],
  loading: true,
  setFamilyId: () => {},
  refresh: async () => {},
});

const KEY = "shajareh_active_family";

export function ActiveFamilyProvider({ children }: { children: ReactNode }) {
  const [families, setFamilies] = useState<FamilySummary[]>([]);
  const [family, setFamily] = useState<FamilyData | null>(null);
  const [familyId, setFamilyIdState] = useState<string | null>(() => localStorage.getItem(KEY));
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const list = await api.get<{ families: FamilySummary[] }>("/families");
      setFamilies(list.families);
      const active = familyId && list.families.some((f) => f.id === familyId) ? familyId : (list.families[0]?.id ?? null);
      setFamilyIdState(active);
    } catch {
      setFamilies([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (familyId) {
      localStorage.setItem(KEY, familyId);
      api
        .get<{ family: FamilySummary & { name: string }; stats: FamilyStats }>(`/families/${familyId}`)
        .then((d) => {
          setFamily({ ...(d.family as FamilySummary), stats: d.stats, name: d.family.name });
        })
        .catch(() => setFamily(null));
    } else {
      setFamily(null);
    }
  }, [familyId]);

  function setFamilyId(id: string) {
    setFamilyIdState(id);
  }

  return (
    <Ctx.Provider value={{ familyId, family, families, loading, setFamilyId, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export function useActiveFamily() {
  return useContext(Ctx);
}