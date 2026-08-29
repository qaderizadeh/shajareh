import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useActiveFamily } from "../activeFamily";
import { api } from "../lib/api";
import { Button, Card, EmptyState, Field, Select } from "../components/ui";
import { personName } from "../lib/format";
import type { Person } from "../lib/types";

interface PathResult {
  path: Array<{ id: string; first_name: string; last_name: string; gender: string }>;
  explain: string;
}

export default function RelationPathPage() {
  const [params] = useSearchParams();
  const { familyId } = useActiveFamily();
  const [people, setPeople] = useState<Person[]>([]);
  const [fromId, setFromId] = useState(params.get("from") ?? "");
  const [toId, setToId] = useState(params.get("to") ?? "");
  const [result, setResult] = useState<PathResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!familyId) return;
    api.get<{ results: Person[] }>(`/search?familyId=${familyId}&limit=200`).then((d) => setPeople(d.results)).catch(() => {});
  }, [familyId]);

  async function findPath() {
    if (!fromId || !toId || fromId === toId) return;
    setLoading(true);
    setErr("");
    setResult(null);
    try {
      const r = await api.get<PathResult>(`/relationships/path?fromId=${fromId}&toId=${toId}`);
      setResult(r);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 620 }}>
      <h1 className="page-title">یافتن مسیر رابطه</h1>
      <p className="page-sub">مسیر رابطهٔ خانوادگی دو فرد را پیدا کن و ببین چطور به هم مرتبط‌اند.</p>

      <Card>
        <div className="row spacing-2" style={{ flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <Field label="فرد اول">
              <Select value={fromId} onChange={(e) => setFromId(e.target.value)}>
                <option value="">انتخاب کنید…</option>
                {people.map((p) => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
              </Select>
            </Field>
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <Field label="فرد دوم">
              <Select value={toId} onChange={(e) => setToId(e.target.value)}>
                <option value="">انتخاب کنید…</option>
                {people.map((p) => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
              </Select>
            </Field>
          </div>
        </div>
        <Button onClick={findPath} disabled={loading || !fromId || !toId || fromId === toId}>
          {loading ? "…در حال جستجو" : "🔍 پیدا کردن مسیر"}
        </Button>
      </Card>

      {err && <Card style={{ marginTop: 12, background: "var(--danger-soft)", color: "var(--danger)" }}>{err}</Card>}

      {result && (
        <Card style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 8 }}>نتیجه</h3>
          <p style={{ fontSize: "var(--text-base)", lineHeight: 1.8 }}>{result.explain}</p>
          {result.path.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div className="muted" style={{ fontSize: "var(--text-xs)", marginBottom: 6 }}>مسیر:</div>
              <div className="row wrap spacing-2">
                {result.path.map((p, i) => (
                  <span key={p.id}>
                    <span className="chip">{personName(p.first_name, p.last_name)}</span>
                    {i < result.path.length - 1 && <span style={{ margin: "0 4px", color: "var(--muted)" }}>→</span>}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {!result && !loading && !err && (
        <EmptyState icon="🔗" title="دو فرد را انتخاب کن" hint="مسیر رابطهٔ خانوادگی بین دو فرد نمایش داده خواهد شد." />
      )}
    </div>
  );
}
