import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useActiveFamily } from "../activeFamily";
import { api } from "../lib/api";
import { Button, Card, Field, Modal, Select, TextArea, TextInput, useToast } from "../components/ui";
import type { Gender, Person } from "../lib/types";

interface RelDraft {
  id: number;
  type: "PARENT" | "SPOUSE" | "CHILD" | "SIBLING";
  mode: "existing" | "new";
  existingId?: string;
  newName?: string;
  newGender?: Gender;
}

interface PersonPayload {
  first_name: string;
  last_name?: string;
  gender?: Gender;
  birth_date_text?: string;
  death_date_text?: string;
  birth_place?: string;
  death_place?: string;
  occupation?: string;
  residence?: string;
  education?: string;
  biography?: string;
  is_living?: boolean;
}

export default function AddPersonPage() {
  const { familyId, refresh } = useActiveFamily();
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState<PersonPayload>({
    first_name: "", last_name: "", gender: "UNKNOWN",
    birth_date_text: "", birth_place: "", death_date_text: "", death_place: "",
    occupation: "", residence: "", education: "", biography: "",
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [rels, setRels] = useState<RelDraft[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [dup, setDup] = useState<{ id: string; first_name: string; last_name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function checkDupes(): Promise<{ id: string; first_name: string; last_name: string } | null> {
    if (!form.first_name.trim() || !familyId) return null;
    try {
      const { duplicates } = await api.post<{ duplicates: Array<{ id: string; first_name: string; last_name: string }> }>(
        "/persons/check-duplicates",
        { family_id: familyId, first_name: form.first_name, last_name: form.last_name }
      );
      return duplicates[0] ?? null;
    } catch {
      return null;
    }
  }

  useEffect(() => {
    if (!familyId) return;
    api.get<{ results: Person[] }>(`/search?familyId=${familyId}&limit=100`).then((d) => setPeople(d.results)).catch(() => {});
  }, [familyId]);

  function addRel(type: RelDraft["type"]) {
    setRels((r) => [...r, { id: Date.now() + Math.random(), type, mode: "new" }]);
  }

  async function createPersonCore(payload: PersonPayload, extraRels: RelDraft[]): Promise<string> {
    const { person } = await api.post<{ person: Person }>("/persons", { ...payload, is_living: payload.is_living ?? true, family_id: familyId });
    const id = person.id;
    // ایجاد/اتصال روابط
    for (const r of extraRels) {
      const type = r.type as string;
      if (r.mode === "existing" && r.existingId) {
        // PARENT: از-سمت باشد؟ در UI «فرزند» یعنی این شخص فرزند فرد موجود است
        const from = type === "CHILD" ? r.existingId : id;
        const to = type === "CHILD" ? id : r.existingId;
        const relType = type === "CHILD" ? "PARENT" : type;
        await api.post("/relationships", { family_id: familyId, person_a_id: from, person_b_id: to, relationship_type: relType }).catch(() => {});
      } else if (r.mode === "new" && r.newName?.trim()) {
        const { person: other } = await api.post<{ person: Person }>("/persons", {
          family_id: familyId, first_name: r.newName.trim(), gender: r.newGender ?? "UNKNOWN", is_living: true,
        });
        const from = type === "CHILD" ? other.id : id;
        const to = type === "CHILD" ? id : other.id;
        const relType = type === "CHILD" ? "PARENT" : type;
        await api.post("/relationships", { family_id: familyId, person_a_id: from, person_b_id: to, relationship_type: relType }).catch(() => {});
      }
    }
    return id;
  }

  function setField(k: keyof PersonPayload, v: string | boolean) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(force = false) {
    setError("");
    if (!familyId) return setError("ابتدا یک خانواده بسازید.");
    if (!form.first_name.trim()) return setError("نام را وارد کنید.");
    if (!force) {
      const d = await checkDupes();
      if (d) { setDup(d); return; }
    }
    setBusy(true);
    try {
      const id = await createPersonCore(form, rels);
      await refresh();
      toast.push("با موفقیت ذخیره شد", "success");
      navigate(`/persons/${id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function updateRel(id: number, patch: Partial<RelDraft>) {
    setRels((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function removeRel(id: number) {
    setRels((rows) => rows.filter((r) => r.id !== id));
  }

  return (
    <div style={{ maxWidth: 620 }}>
      <h1 className="page-title">افزودن فرد</h1>
      <p className="page-sub">ابتدا اطلاعات پایه، سپس می‌توانی روابط خانوادگی را اضافه کنی.</p>

      <Card>
        {/* گام ۱: اطلاعات پایه */}
        <h3 style={{ marginBottom: 14 }}>۱) اطلاعات پایه</h3>
        <div className="row spacing-2" style={{ marginBottom: 0 }}>
          <div style={{ flex: 2 }}><Field label="نام *"><TextInput value={form.first_name} onChange={(e) => { setField("first_name", e.target.value); setDup(null); }} placeholder="مثلاً احمد" /></Field></div>
          <div style={{ flex: 2 }}><Field label="نام خانوادگی"><TextInput value={form.last_name} onChange={(e) => setField("last_name", e.target.value)} placeholder="مثلاً قادری" /></Field></div>
        </div>
        <Field label="جنسیت">
          <Select value={form.gender} onChange={(e) => setField("gender", e.target.value as Gender)}>
            <option value="UNKNOWN">نامشخص</option>
            <option value="MALE">مرد</option>
            <option value="FEMALE">زن</option>
          </Select>
        </Field>

        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowAdvanced((s) => !s)}>
          {showAdvanced ? "▼ اطلاعات تکمیلی" : "◀ اطلاعات تکمیلی"}
        </button>
        {showAdvanced && (
          <div style={{ marginTop: 12 }}>
            <div className="row spacing-2" style={{ marginBottom: 0 }}>
              <div style={{ flex: 1 }}><Field label="تاریخ تولد"><TextInput placeholder="مثلاً حدود ۱۳۰۰" value={form.birth_date_text} onChange={(e) => setField("birth_date_text", e.target.value)} /></Field></div>
              <div style={{ flex: 1 }}><Field label="محل تولد"><TextInput placeholder="مثلاً پاوه" value={form.birth_place} onChange={(e) => setField("birth_place", e.target.value)} /></Field></div>
            </div>
            <div className="row spacing-2" style={{ marginBottom: 0 }}>
              <div style={{ flex: 1 }}><Field label="تاریخ وفات"><TextInput placeholder="خالی یعنی زنده" value={form.death_date_text} onChange={(e) => { setField("death_date_text", e.target.value); setField("is_living", e.target.value ? false : true); }} /></Field></div>
              <div style={{ flex: 1 }}><Field label="محل وفات"><TextInput placeholder="مثلاً سنندج" value={form.death_place} onChange={(e) => setField("death_place", e.target.value)} /></Field></div>
            </div>
            <Field label="شغل"><TextInput value={form.occupation} onChange={(e) => setField("occupation", e.target.value)} /></Field>
            <Field label="محل زندگی"><TextInput value={form.residence} onChange={(e) => setField("residence", e.target.value)} /></Field>
            <Field label="زندگی‌نامه / خاطرات"><TextArea value={form.biography} onChange={(e) => setField("biography", e.target.value)} /></Field>
          </div>
        )}

        {/* گام ۲: روابط */}
        <div style={{ marginTop: 8, marginBottom: 14 }}>
          <h3 style={{ marginBottom: 12 }}>۲) روابط خانوادگی <span className="muted" style={{ fontSize: "var(--text-xs)", fontWeight: 400 }}>(اختیاری)</span></h3>
          <div className="row wrap spacing-2">
            <ChipAction label="👪 والد" onClick={() => addRel("PARENT")} />
            <ChipAction label="💞 همسر" onClick={() => addRel("SPOUSE")} />
            <ChipAction label="👶 فرزند" onClick={() => addRel("CHILD")} />
            <ChipAction label="🤝 خواهر/برادر" onClick={() => addRel("SIBLING")} />
          </div>

          {rels.map((r) => (
            <div key={r.id} className="card" style={{ marginTop: 12, padding: "var(--space-3)", background: "var(--surface-muted)" }}>
              <div className="row justify-between spacing-3">
                <strong>{relativeLabel(r.type)}</strong>
                <button className="btn btn-ghost btn-sm" onClick={() => removeRel(r.id)}>حذف</button>
              </div>
              <Select
                value={r.mode}
                onChange={(e) => updateRel(r.id, { mode: e.target.value as RelDraft["mode"] })}
                style={{ marginTop: 8 }}
                aria-label="نوع اتصال"
              >
                <option value="new">فرد جدید بساز</option>
                <option value="existing">به فرد موجود متصل کن</option>
              </Select>
              {r.mode === "new" ? (
                <div className="row spacing-2" style={{ marginTop: 8 }}>
                  <TextInput placeholder="نام فرد جدید" value={r.newName ?? ""} onChange={(e) => updateRel(r.id, { newName: e.target.value })} />
                  <Select value={r.newGender ?? "UNKNOWN"} onChange={(e) => updateRel(r.id, { newGender: e.target.value as Gender })}>
                    <option value="UNKNOWN">جنسیت</option>
                    <option value="MALE">مرد</option>
                    <option value="FEMALE">زن</option>
                  </Select>
                </div>
              ) : (
                <Select
                  value={r.existingId ?? ""}
                  onChange={(e) => updateRel(r.id, { existingId: e.target.value })}
                  style={{ marginTop: 8 }}
                  aria-label="فرد موجود"
                >
                  <option value="">انتخاب فرد…</option>
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
                  ))}
                </Select>
              )}
            </div>
          ))}
        </div>

        {error && <div style={{ marginBottom: 14, background: "var(--danger-soft)", color: "var(--danger)", padding: "10px 12px", borderRadius: 8, fontSize: "var(--text-sm)" }}>{error}</div>}

        <Button type="button" onClick={() => submit()} block size="lg" disabled={busy}>
          {busy ? "…در حال ذخیره" : "ثبت فرد"}
        </Button>
      </Card>

      {/* گفتگوی تشخیص فرد مشابه */}
      <Modal open={!!dup && !busy} title="فرد مشابه پیدا شد" onClose={() => setDup(null)}>
        <p>
          این فرد به نظر با <strong>{dup?.first_name} {dup?.last_name}</strong> مشابه است. آیا همان شخص است؟
        </p>
        <div className="row spacing-2" style={{ marginTop: 16 }}>
          <Button onClick={() => { const id = dup!.id; setDup(null); refresh(); navigate(`/persons/${id}`); }}>بله، همان است</Button>
          <Button variant="secondary" onClick={() => { setDup(null); submit(true); }}>خیر، فرد جدید</Button>
        </div>
      </Modal>
    </div>
  );
}

function ChipAction({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="chip" onClick={onClick}>{label}</button>
  );
}

function relativeLabel(type: RelDraft["type"]): string {
  const map: Record<string, string> = { PARENT: "والد", SPOUSE: "همسر", CHILD: "فرزند", SIBLING: "خواهر/برادر" };
  return map[type] ?? type;
}