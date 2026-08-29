import { useEffect, useState } from "react";
import { useActiveFamily } from "../activeFamily";
import { api } from "../lib/api";
import { Button, Card, EmptyState, ErrorState, Field, LoadingState, Modal, TextArea, TextInput, useToast } from "../components/ui";
import type { Person } from "../lib/types";

interface Story {
  id: string;
  title: string;
  body: string;
  person_id: string | null;
  date_text: string;
  location: string;
  created_at: string;
}

export default function StoriesPage() {
  const { familyId } = useActiveFamily();
  const toast = useToast();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", date_text: "", location: "", person_id: "" });
  const [people, setPeople] = useState<Person[]>([]);
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!familyId) return;
    setLoading(true);
    try {
      const d = await api.get<{ stories: Story[] }>(`/stories/list/${familyId}`);
      setStories(d.stories);
      const p = await api.get<{ results: Person[] }>(`/search?familyId=${familyId}&limit=100`);
      setPeople(p.results);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [familyId]);

  async function create() {
    if (!familyId || !form.title.trim()) return;
    setBusy(true);
    try {
      await api.post("/stories", { family_id: familyId, ...form, person_id: form.person_id || undefined });
      toast.push("داستان ذخیره شد", "success");
      setOpen(false);
      setForm({ title: "", body: "", date_text: "", location: "", person_id: "" });
      load();
    } catch (e) {
      toast.push((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!familyId) return;
    try {
      await api.del(`/stories/${id}?familyId=${familyId}`);
      toast.push("داستان حذف شد", "success");
      load();
    } catch (e) {
      toast.push((e as Error).message, "error");
    }
  }

  if (loading) return <LoadingState label="در حال بارگذاری داستان‌ها…" />;
  if (err) return <ErrorState message={err} onRetry={load} />;

  return (
    <div style={{ maxWidth: 620 }}>
      <div className="row justify-between" style={{ marginBottom: 8 }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>داستان‌های خانواده</h1>
        <Button size="sm" onClick={() => setOpen(true)}>+ داستان جدید</Button>
      </div>
      <p className="page-sub">خاطرات و داستان‌های خانواده‌ات را ثبت کن تا برای نسل‌های بعد بماند.</p>

      {stories.length === 0 ? (
        <EmptyState
          icon="📖"
          title="هنوز داستانی ثبت نشده"
          hint="داستان‌های خانوادگی، خاطرات سفر، یا هر رویداد مهمی را اینجا بنویس."
          actions={<Button onClick={() => setOpen(true)}>نوشتن اولین داستان</Button>}
        />
      ) : (
        <div className="col spacing-3">
          {stories.map((s) => (
            <Card key={s.id}>
              <div className="row justify-between">
                <h3 style={{ fontSize: "var(--text-lg)" }}>{s.title}</h3>
                <button className="btn btn-ghost btn-sm" onClick={() => remove(s.id)} aria-label="حذف داستان">🗑️</button>
              </div>
              {(s.date_text || s.location) && (
                <div className="muted" style={{ fontSize: "var(--text-xs)", marginTop: 4 }}>
                  {s.date_text}{s.location ? ` · ${s.location}` : ""}
                </div>
              )}
              {s.body && <p style={{ marginTop: 8, whiteSpace: "pre-wrap", fontSize: "var(--text-sm)" }}>{s.body}</p>}
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} title="داستان جدید" onClose={() => setOpen(false)}>
        <Field label="عنوان *">
          <TextInput value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="مثلاً مهاجرت خانواده در سال ۱۳۴۵" />
        </Field>
        <Field label="متن داستان">
          <TextArea value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} placeholder="داستان را اینجا بنویسید…" style={{ minHeight: 120 }} />
        </Field>
        <div className="row spacing-2">
          <div style={{ flex: 1 }}><Field label="تاریخ"><TextInput value={form.date_text} onChange={(e) => setForm((f) => ({ ...f, date_text: e.target.value }))} placeholder="مثلاً ۱۳۴۵" /></Field></div>
          <div style={{ flex: 1 }}><Field label="محل"><TextInput value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="مثلاً تهران" /></Field></div>
        </div>
        {people.length > 0 && (
          <Field label="فرد مرتبط (اختیاری)">
            <select className="select" value={form.person_id} onChange={(e) => setForm((f) => ({ ...f, person_id: e.target.value }))}>
              <option value="">بدون فرد خاص</option>
              {people.map((p) => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
            </select>
          </Field>
        )}
        <Button block onClick={create} disabled={busy || !form.title.trim()} style={{ marginTop: 8 }}>
          {busy ? "…در حال ذخیره" : "ذخیره داستان"}
        </Button>
      </Modal>
    </div>
  );
}
