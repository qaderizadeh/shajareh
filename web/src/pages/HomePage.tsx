import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { useActiveFamily } from "../activeFamily";
import { Button, Card, EmptyState, LoadingState, Select, ErrorState } from "../components/ui";
import { api } from "../lib/api";
import { faDigits, lifeSpan } from "../lib/format";
import { useEffect, useState } from "react";
import type { Person } from "../lib/types";

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div style={{ textAlign: "center", flex: 1 }}>
      <div style={{ fontSize: "var(--text-xl)", fontWeight: 800, color: "var(--primary)" }}>{faDigits(value)}</div>
      <div className="muted" style={{ fontSize: "var(--text-xs)" }}>{label}</div>
    </div>
  );
}

export default function HomePage() {
  const { user } = useAuth();
  const { familyId, family, families, loading, setFamilyId, refresh } = useActiveFamily();
  const navigate = useNavigate();
  const [people, setPeople] = useState<Person[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!familyId) return;
    api
      .get<{ results: Person[] }>(`/search?familyId=${familyId}&limit=8`)
      .then((d) => setPeople(d.results))
      .catch((e) => setErr((e as Error).message));
  }, [familyId]);

  function greeting(): string {
    const h = new Date().getHours();
    if (h < 12) return "صبح بخیر";
    if (h < 17) return "ظهر بخیر";
    return "عصر بخیر";
  }

  if (loading) return <LoadingState label="در حال بارگذاری…" />;

  return (
    <div>
      <h1 className="page-title">{greeting()} {user?.name?.split(" ")[0]} 👋</h1>
      <p className="page-sub">به آرشیو زندهٔ خانواده‌ات خوش آمدی.</p>

      {families.length === 0 ? (
        <Card>
          <EmptyState
            icon="🌱"
            title="هنوز خانواده‌ای نساخته‌ای"
            hint="ساخت اولین شجره فقط چند دقیقه زمان می‌برد — یا بگذار هوش مصنوعی با متن، خانواده‌ات را بسازد."
            actions={
              <>
                <Button onClick={() => navigate("/onboarding")}>ساخت خانواده</Button>
                <Button variant="soft" onClick={() => navigate("/ai")}>✨ ساخت با هوش مصنوعی</Button>
                <Button variant="secondary" onClick={() => navigate("/onboarding", { state: { createPerson: true } })}>ثبت اولین نفر</Button>
              </>
            }
          />
        </Card>
      ) : (
        <>
          {/* انتخاب خانواده */}
          <Card className="row justify-between spacing-3" style={{ marginBottom: 16, padding: "var(--space-3) var(--space-4)" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700 }}>{family?.name ?? "…"}</div>
              {family?.description && <div className="muted" style={{ fontSize: "var(--text-sm)" }}>{family.description}</div>}
            </div>
            {families.length > 1 && (
              <Select
                value={familyId ?? ""}
                onChange={(e) => setFamilyId(e.target.value)}
                style={{ maxWidth: 160 }}
                aria-label="انتخاب خانواده"
              >
                {families.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </Select>
            )}
          </Card>

          {/* آمار */}
          <Card style={{ marginBottom: 16 }}>
            <div className="row justify-between" style={{ padding: "0 var(--space-2)" }}>
              <Stat value={family?.stats.persons ?? 0} label="نفر" />
              <Stat value={family?.stats.generations ?? 0} label="نسل" />
              <Stat value={family?.stats.media ?? 0} label="عکس" />
              <Stat value={family?.stats.spouses ?? 0} label="ازدواج" />
            </div>
            <div className="row spacing-2" style={{ marginTop: 16, flexWrap: "wrap" }}>
              <Button size="sm" onClick={() => navigate(`/tree${familyId ? `?family=${familyId}&root=auto` : ""}`)}>مشاهده شجره</Button>
              <Button variant="soft" size="sm" onClick={() => navigate("/persons/new")}>+ افزودن فرد</Button>
              <Button variant="secondary" size="sm" onClick={() => navigate("/ai")}>✨ ساخت با هوش مصنوعی</Button>
            </div>
          </Card>

          {/* آخرین افراد */}
          <div className="row justify-between" style={{ marginBottom: 10, marginTop: 20 }}>
            <h3 style={{ fontSize: "var(--text-lg)" }}>آخرین افراد</h3>
            <Link to="/search" style={{ fontSize: "var(--text-sm)" }}>همه</Link>
          </div>
          {err ? (
            <ErrorState message={err} onRetry={() => refresh()} />
          ) : people.length === 0 ? (
            <EmptyState
              icon="🌿"
              title="هنوز کسی اضافه نشده است"
              hint="اولین عضو خانواده را ثبت کن یا داستان خانواده را با هوش مصنوعی بساز."
              actions={
                <>
                  <Button onClick={() => navigate("/persons/new")}>افزودن اولین نفر</Button>
                  <Button variant="soft" onClick={() => navigate("/ai")}>✨ ساخت با هوش مصنوعی</Button>
                </>
              }
            />
          ) : (
            <div className="list">
              {people.map((p) => (
                <div key={p.id} className="list-item" onClick={() => navigate(`/persons/${p.id}`)}>
                  <div className="avatar" style={{ width: 40, height: 40, fontSize: "var(--text-sm)" }}>
                    {(p.first_name?.[0] ?? "؟")}
                  </div>
                  <div className="grow">
                    <div style={{ fontWeight: 600 }}>{p.first_name} {p.last_name}</div>
                    <div className="muted" style={{ fontSize: "var(--text-xs)" }}>{lifeSpan(p)}</div>
                  </div>
                  <span className="muted">‹</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}