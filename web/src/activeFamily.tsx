import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
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
  const [familyId, setFamilyIdState] = useState<string | null>(() => {
    try { return localStorage.getItem(KEY); } catch { return null; }
  });
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  const familyIdRef = useRef(familyId);

  // Keep ref in sync
  useEffect(() => { familyIdRef.current = familyId; }, [familyId]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const refresh = useCallback(async () => {
    if (!mountedRef.current) return;
    setLoading(true);
    try {
      const list = await api.get<{ families: FamilySummary[] }>("/families");
      if (!mountedRef.current) return;
      setFamilies(list.families);
      const current = familyIdRef.current;
      const active = current && list.families.some((f) => f.id === current)
        ? current
        : (list.families[0]?.id ?? null);
      setFamilyIdState(active);
    } catch {
      if (mountedRef.current) setFamilies([]);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Load family details when familyId changes
  useEffect(() => {
    if (familyId) {
      localStorage.setItem(KEY, familyId);
      let cancelled = false;
      api
        .get<{ family: FamilySummary & { name: string }; stats: FamilyStats }>(`/families/${familyId}`)
        .then((d) => {
          if (!cancelled && mountedRef.current) {
            setFamily({ ...(d.family as FamilySummary), stats: d.stats, name: d.family.name });
          }
        })
        .catch(() => {
          if (!cancelled && mountedRef.current) setFamily(null);
        });
      return () => { cancelled = true; };
    } else {
      setFamily(null);
    }
  }, [familyId]);

  const setFamilyId = useCallback((id: string) => {
    setFamilyIdState(id);
  }, []);

  return (
    <Ctx.Provider value={{ familyId, family, families, loading, setFamilyId, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export function useActiveFamily() {
  return useContext(Ctx);
}
