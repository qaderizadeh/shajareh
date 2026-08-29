import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Button, Card, EmptyState, ErrorState, LoadingState, Modal, Select, Tabs, useToast } from "../components/ui";
import { faDigits } from "../lib/format";
import type { User } from "../lib/types";

interface AuditLog {
  id: number;
  user_id: string;
  user_name: string;
  entity_type: string;
  entity_id: string;
  action: string;
  before: string | null;
  after: string | null;
  created_at: string;
}

interface FamilyRow {
  id: string;
  name: string;
  description: string | null;
  persons_count: number;
  members_count: number;
  created_at: string;
}

export default function AdminPage() {
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [families, setFamilies] = useState<FamilyRow[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState<"stats" | "users" | "families" | "logs">("stats");
  const toast = useToast();
  const [targetUser, setTargetUser] = useState<User | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const s = await api.get<{ stats: Record<string, number> }>("/admin/stats");
        setStats(s.stats);
        const u = await api.get<{ users: User[] }>("/admin/users");
        setUsers(u.users);
        const f = await api.get<{ families: FamilyRow[] }>("/admin/families");
        setFamilies(f.families);
        const l = await api.get<{ logs: AuditLog[] }>("/admin/audit-logs?limit=30");
        setLogs(l.logs);
      } catch (e) {
        setErr((e as Error).message);
      }
    })();
  }, []);

  async function changeRole(user: User, role: "ADMIN" | "USER") {
    try {
      await api.patch(`/admin/users/${user.id}/role`, { role });
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, role } : u));
      toast.push(`نقش ${user.name} تغییر کرد`, "success");
    } catch (e) {
      toast.push((e as Error).message, "error");
    }
  }

  async function deleteUser() {
    if (!targetUser) return;
    try {
      await api.del(`/admin/users/${targetUser.id}`);
      setUsers((prev) => prev.filter((u) => u.id !== targetUser.id));
      toast.push(`${targetUser.name} حذف شد`, "success");
      setConfirmDelete(false);
      setTargetUser(null);
    } catch (e) {
      toast.push((e as Error).message, "error");
    }
  }

  if (err) return <ErrorState message={err} />;
  if (!stats) return <LoadingState label="در حال بارگذاری آمار…" />;

  const cards = [
    ["کاربران", stats.users], ["خانواده‌ها", stats.families],
    ["افراد", stats.persons], ["روابط", stats.relationships],
    ["رسانه", stats.media], ["پیشنهادهای هوش", stats.aiProposals],
  ];

  return (
    <div style={{ maxWidth: 700 }}>
      <h1 className="page-title">پنل مدیریت</h1>
      <p className="page-sub">آمار، کاربران، خانواده‌ها و تاریخچه تغییرات.</p>

      {/* تب‌ها */}
      <Tabs
        tabs={[
          { key: "stats", label: "📊 آمار" },
          { key: "users", label: "👤 کاربران" },
          { key: "families", label: "👨‍👩‍👧‍👦 خانواده‌ها" },
          { key: "logs", label: "📋 تغییرات" },
        ]}
        active={tab}
        onChange={(k) => setTab(k as typeof tab)}
      />

      {/* آمار */}
      {tab === "stats" && (
        <div className="row wrap" style={{ gap: "var(--space-3)", marginTop: 16 }}>
          {cards.map(([label, val]) => (
            <Card key={String(label)} style={{ flex: "1 1 140px", textAlign: "center", padding: "var(--space-4)" }}>
              <div style={{ fontSize: "var(--text-xl)", fontWeight: 800, color: "var(--primary)" }}>{faDigits(val)}</div>
              <div className="muted" style={{ fontSize: "var(--text-xs)" }}>{label}</div>
            </Card>
          ))}
        </div>
      )}

      {/* کاربران */}
      {tab === "users" && (
        <div style={{ marginTop: 16 }}>
          {users.length === 0 ? (
            <EmptyState icon="👤" title="کاربری ثبت نشده است" />
          ) : (
            <Card>
              <div className="list">
                {users.map((u) => (
                  <div key={u.id} className="list-item" style={{ cursor: "default", flexWrap: "wrap" }}>
                    <div className="avatar" style={{ width: 38, height: 38, fontSize: "var(--text-sm)" }}>{u.name?.[0] ?? "؟"}</div>
                    <div className="grow">
                      <div style={{ fontWeight: 600 }}>{u.name}</div>
                      <div className="muted" style={{ fontSize: "var(--text-xs)", direction: "ltr", textAlign: "left" }}>{u.email}</div>
                    </div>
                    <div className="row spacing-2" style={{ flexWrap: "wrap" }}>
                      <Select value={u.role} onChange={(e) => changeRole(u, e.target.value as "ADMIN" | "USER")} style={{ minWidth: 100, minHeight: 34, padding: "4px 8px", fontSize: "var(--text-xs)" }}>
                        <option value="USER">کاربر</option>
                        <option value="ADMIN">مدیر</option>
                      </Select>
                      <Button variant="danger" size="sm" onClick={() => { setTargetUser(u); setConfirmDelete(true); }} style={{ minHeight: 34, padding: "4px 10px", fontSize: "var(--text-xs)" }}>حذف</Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* خانواده‌ها */}
      {tab === "families" && (
        <div style={{ marginTop: 16 }}>
          {families.length === 0 ? (
            <EmptyState icon="👨‍👩‍👧‍👦" title="خانواده‌ای ثبت نشده است" />
          ) : (
            <Card>
              <div className="list">
                {families.map((f) => (
                  <div key={f.id} className="list-item" style={{ cursor: "default" }}>
                    <div className="grow">
                      <div style={{ fontWeight: 600 }}>{f.name}</div>
                      <div className="muted" style={{ fontSize: "var(--text-xs)" }}>
                        {faDigits(f.persons_count)} نفر · {faDigits(f.members_count)} عضو
                        {f.description ? ` · ${f.description}` : ""}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* تاریخچه تغییرات */}
      {tab === "logs" && (
        <div style={{ marginTop: 16 }}>
          {logs.length === 0 ? (
            <EmptyState icon="📋" title="تغییری ثبت نشده است" />
          ) : (
            <Card>
              <div className="list">
                {logs.map((l) => (
                  <div key={l.id} className="list-item" style={{ cursor: "default" }}>
                    <div className="grow">
                      <div style={{ fontWeight: 600, fontSize: "var(--text-sm)" }}>
                        {l.user_name ?? "سیستم"} · {l.entity_type} · {l.action}
                      </div>
                      <div className="muted" style={{ fontSize: "var(--text-xs)" }}>{l.created_at}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      <Modal open={confirmDelete} title="حذف کاربر" onClose={() => setConfirmDelete(false)}>
        <p>آیا از حذف <strong>{targetUser?.name}</strong> مطمئنید؟</p>
        <div className="row spacing-2" style={{ marginTop: 16 }}>
          <Button variant="danger" onClick={deleteUser}>بله، حذف شود</Button>
          <Button variant="secondary" onClick={() => setConfirmDelete(false)}>لغو</Button>
        </div>
      </Modal>
    </div>
  );
}
