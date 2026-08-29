import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Card, EmptyState, ErrorState, LoadingState } from "../components/ui";
import { faDigits } from "../lib/format";
import type { User } from "../lib/types";

export default function AdminPage() {
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const s = await api.get<{ stats: Record<string, number> }>("/admin/stats");
        setStats(s.stats);
        const u = await api.get<{ users: User[] }>("/admin/users");
        setUsers(u.users);
      } catch (e) {
        setErr((e as Error).message);
      }
    })();
  }, []);

  if (err) return <ErrorState message={err} />;
  if (!stats) return <LoadingState label="در حال بارگذاری آمار…" />;

  const cards = [
    ["کاربران", stats.users], ["خانواده‌ها", stats.families],
    ["افراد", stats.persons], ["روابط", stats.relationships],
    ["رسانه", stats.media], ["پیشنهادهای هوش", stats.aiProposals],
  ];

  return (
    <div style={{ maxWidth: 640 }}>
      <h1 className="page-title">پنل مدیریت</h1>
      <p className="page-sub">آمار کل سیستم و مدیریت کاربران.</p>

      <div className="row wrap" style={{ gap: "var(--space-3)" }}>
        {cards.map(([label, val]) => (
          <Card key={String(label)} style={{ flex: "1 1 140px", textAlign: "center", padding: "var(--space-4)" }}>
            <div style={{ fontSize: "var(--text-xl)", fontWeight: 800, color: "var(--primary)" }}>{faDigits(val)}</div>
            <div className="muted" style={{ fontSize: "var(--text-xs)" }}>{label}</div>
          </Card>
        ))}
      </div>

      <h3 style={{ margin: "20px 0 6px" }}>کاربران</h3>
      {users.length === 0 ? (
        <EmptyState icon="👤" title="کاربری ثبت نشده است" />
      ) : (
        <Card>
          <div className="list">
            {users.map((u) => (
              <div key={u.id} className="list-item" style={{ cursor: "default" }}>
                <div className="avatar" style={{ width: 38, height: 38, fontSize: "var(--text-sm)" }}>{u.name?.[0] ?? "؟"}</div>
                <div className="grow">
                  <div style={{ fontWeight: 600 }}>{u.name}</div>
                  <div className="muted" style={{ fontSize: "var(--text-xs)", direction: "ltr", textAlign: "left" }}>{u.email}</div>
                </div>
                <span className={`badge ${u.role === "ADMIN" ? "badge-primary" : "badge-success"}`}>{u.role === "ADMIN" ? "مدیر" : "کاربر"}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}