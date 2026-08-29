import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useActiveFamily } from "../activeFamily";
import { api } from "../lib/api";
import { EmptyState, LoadingState, TextInput } from "../components/ui";
import { genderLabel, initials } from "../lib/format";
import type { SearchResult } from "../lib/types";

export default function SearchPage() {
  const { familyId } = useActiveFamily();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const path = q.trim() ? `/search?q=${encodeURIComponent(q)}${familyId ? `&familyId=${familyId}` : ""}` : `/search?limit=20${familyId ? `&familyId=${familyId}` : ""}`;
        const d = await api.get<{ results: SearchResult[] }>(path);
        setResults(d.results);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q, familyId]);

  return (
    <div style={{ maxWidth: 620 }}>
      <h1 className="page-title">جستجو در شجره</h1>
      <p className="page-sub">با نام، نام خانوادگی، محل یا شغل می‌توانی فرد را پیدا کنی.</p>

      <div style={{ position: "relative" }}>
        <TextInput
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="مثلاً احمد قادری یا پاوه…"
          style={{ paddingLeft: 40 }}
          autoFocus
        />
        <span style={{ position: "absolute", left: 12, top: 10, fontSize: 18, opacity: 0.6 }}>🔍</span>
      </div>

      <div style={{ marginTop: 12 }}>
        {loading ? (
          <LoadingState label="در حال جست‌وجو…" />
        ) : results.length === 0 ? (
          <EmptyState icon="🔍" title={q ? "نتیجه‌ای پیدا نشد" : "جست‌وجو را شروع کن"} hint={q ? "املای نام را بررسی کن؛ «ی» و «ک» فارسی جست‌وجو می‌شود." : undefined} />
        ) : (
          <div className="list">
            {results.map((r) => (
              <div key={r.id} className="list-item" onClick={() => navigate(`/persons/${r.id}`)}>
                <div className="avatar" style={{ width: 40, height: 40, fontSize: "var(--text-sm)" }}>{initials(r.first_name)}</div>
                <div className="grow">
                  <div style={{ fontWeight: 600 }}>{r.first_name} {r.last_name} <span className="muted" style={{ fontSize: "var(--text-xs)" }}>({genderLabel(r.gender)})</span></div>
                  <div className="muted" style={{ fontSize: "var(--text-xs)" }}>
                    {r.birth_place || "—"} · {r.family_name}{r.birth_date_text ? ` · ${r.birth_date_text}` : ""}
                  </div>
                </div>
                <span className="muted">‹</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}