import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { Avatar, Badge, Button, Card, EmptyState, ErrorState, LoadingState, BottomSheet, Modal, useToast, Field, Select, TextArea, TextInput } from "../components/ui";
import { faDigits, genderLabel, initials, lifeSpan, personName } from "../lib/format";
import { MediaImage } from "../components/MediaImage";
import type { MediaItem, Person, PersonGraphNode } from "../lib/types";

interface FamilyView {
  rootId: string;
  persons: PersonGraphNode[];
  generations: PersonGraphNode[][];
  spouseMap: Record<string, string[]>;
  childMap: Record<string, string[]>;
}

export default function PersonPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [person, setPerson] = useState<Person | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [parents, setParents] = useState<PersonGraphNode[]>([]);
  const [spouses, setSpouses] = useState<PersonGraphNode[]>([]);
  const [children, setChildren] = useState<PersonGraphNode[]>([]);
  const [siblings, setSiblings] = useState<PersonGraphNode[]>([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState<null | "edit" | "media" | "addRel">(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const p = await api.get<{ person: Person }>(`/persons/${id}`);
        setPerson(p.person);
        const fv = await api.get<FamilyView>(`/persons/${id}/family`);
        const m = await api.get<{ media: MediaItem[] }>(`/media/list/${p.person.family_id}?personId=${id}`);
        setMedia(m.media);
        derive(fv);
      } catch (e) {
        setErr((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  function derive(fv: FamilyView) {
    const byId = new Map(fv.persons.map((p) => [p.id, p]));
    const parents: PersonGraphNode[] = [];
    for (const [parentId, kids] of Object.entries(fv.childMap)) {
      if (kids.includes(id!) && parentId !== id) parents.push(byId.get(parentId)!);
    }
    setParents(parents.filter(Boolean));
    setSpouses((fv.spouseMap[id!] ?? []).map((x) => byId.get(x)!).filter(Boolean));
    setChildren((fv.childMap[id!] ?? []).map((x) => byId.get(x)!).filter(Boolean));
    const sib = new Set<string>();
    for (const parentId of new Set(fv.persons.map((p) => p.id))) {
      const kids = fv.childMap[parentId] ?? [];
      if (kids.includes(id!) && kids.length > 1) kids.forEach((k) => { if (k !== id) sib.add(k); });
    }
    setSiblings([...sib].map((x) => byId.get(x)!).filter(Boolean));
  }

  async function deletePerson() {
    if (!person) return;
    try {
      await api.del(`/persons/${person.id}`);
      toast.push("فرد حذف شد", "success");
      navigate("/");
    } catch (e) {
      toast.push((e as Error).message, "error");
    }
  }

  if (loading) return <LoadingState label="در حال بارگذاری…" />;
  if (err) return <ErrorState message={err} onRetry={() => window.location.reload()} />;
  if (!person) return null;

  return (
    <div style={{ maxWidth: 620 }}>
      <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>→ بازگشت</button>

      {/* هدر پروفایل */}
      <Card style={{ marginTop: 8, textAlign: "center" }} className="person-hero">
        <Avatar name={personName(person.first_name)} gender={person.gender} size="xl" />
        <h1 style={{ fontSize: "var(--text-xl)", marginTop: 8 }}>{person.first_name} {person.last_name}</h1>
        <div className="muted">{lifeSpan(person)}</div>
        <div className="row center spacing-2" style={{ marginTop: 6, flexWrap: "wrap" }}>
          <Badge>{genderLabel(person.gender)}</Badge>
          {person.is_living === 1 ? <Badge tone="success">زنده</Badge> : <Badge>درگذشته</Badge>}
          {person.occupation && <Badge>{person.occupation}</Badge>}
        </div>
        <div className="row center spacing-2" style={{ marginTop: 14, flexWrap: "wrap" }}>
          <Button size="sm" onClick={() => navigate(`/tree?family=${person.family_id}&root=${person.id}`)}>🌳 در شجره</Button>
          <Button variant="soft" size="sm" onClick={() => setSheet("media")}>📷 عکس‌ها ({media.length})</Button>
          <Button variant="secondary" size="sm" onClick={() => setSheet("edit")}>ویرایش</Button>
          <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>🗑️ حذف</Button>
        </div>
      </Card>

      {/* خانواده */}
      <h3 style={{ margin: "20px 0 8px" }}>خانواده</h3>
      <RelGroup title="والدین" items={parents} onPick={(pid) => navigate(`/persons/${pid}`)} empty="هنوز والدی ثبت نشده است" />
      <RelGroup title="همسر" items={spouses} onPick={(pid) => navigate(`/persons/${pid}`)} empty="هنوز همسری ثبت نشده است" action="+ افزودن همسر" onAction={() => setSheet("addRel")} />
      <RelGroup title="فرزندان" items={children} onPick={(pid) => navigate(`/persons/${pid}`)} empty="هنوز فرزندی ثبت نشده است" />
      <RelGroup title="خواهر/برادر" items={siblings} onPick={(pid) => navigate(`/persons/${pid}`)} empty="هنوز ثبت نشده است" />

      {/* اطلاعات پایه */}
      {(person.birth_place || person.residence || person.education || person.father_name || person.mother_name) && (
        <>
          <h3 style={{ margin: "20px 0 8px" }}>جزئیات</h3>
          <Card>
            <Detail label="نام پدر" value={person.father_name || "—"} />
            <Detail label="نام مادر" value={person.mother_name || "—"} />
            <Detail label="محل تولد" value={person.birth_place || "—"} />
            <Detail label="محل زندگی" value={person.residence || "—"} />
            <Detail label="تحصیلات" value={person.education || "—"} />
          </Card>
        </>
      )}

      {person.biography && (
        <>
          <h3 style={{ margin: "20px 0 8px" }}>زندگی‌نامه</h3>
          <Card>
            <p style={{ whiteSpace: "pre-wrap" }}>{person.biography}</p>
          </Card>
        </>
      )}

      {/* Timeline */}
      <Timeline person={person} />

      {/* رسانه */}
      <BottomSheet open={sheet === "media"} title="عکس‌ها و اسناد" onClose={() => setSheet(null)}>
        <MetaUpload groupId={id!} familyId={person.family_id} />
        {media.length === 0 ? (
          <EmptyState icon="🖼️" title="هنوز عکسی ثبت نشده است" />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginTop: 12 }}>
            {media.map((m) => (
              <MediaImage
                key={m.id}
                mediaId={m.id}
                alt={m.caption || "عکس"}
                style={{ width: "100%", height: 110, objectFit: "cover", borderRadius: 12 }}
              />
            ))}
          </div>
        )}
      </BottomSheet>

      {/* ویرایش */}
      <BottomSheet open={sheet === "edit"} title="ویرایش اطلاعات" onClose={() => setSheet(null)}>
        <EditForm person={person} onSaved={() => { setSheet(null); toast.push("ذخیره شد", "success"); window.location.reload(); }} />
      </BottomSheet>

      {/* افزودن رابطه */}
      <BottomSheet open={sheet === "addRel"} title="افزودن رابطه" onClose={() => setSheet(null)}>
        <AddRelForm
          personId={person.id}
          familyId={person.family_id}
          onDone={() => { setSheet(null); toast.push("رابطه اضافه شد", "success"); window.location.reload(); }}
        />
      </BottomSheet>

      {/* تأیید حذف */}
      <Modal open={confirmDelete} title="حذف فرد" onClose={() => setConfirmDelete(false)}>
        <p>آیا از حذف <strong>{person.first_name} {person.last_name}</strong> مطمئنید؟ این عمل بازگشت‌ناپذیر است.</p>
        <div className="row spacing-2" style={{ marginTop: 16 }}>
          <Button variant="danger" onClick={deletePerson}>بله، حذف شود</Button>
          <Button variant="secondary" onClick={() => setConfirmDelete(false)}>لغو</Button>
        </div>
      </Modal>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="row justify-between" style={{ padding: "6px 0", borderBottom: "var(--hairline)" }}>
      <span className="muted">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function RelGroup({ title, items, onPick, empty, action, onAction }: { title: string; items: PersonGraphNode[]; onPick: (id: string) => void; empty: string; action?: string; onAction?: () => void }) {
  if (items.length === 0) {
    return (
      <Card className="row justify-between" style={{ padding: "var(--space-3) var(--space-4)" }}>
        <span className="muted" style={{ fontSize: "var(--text-sm)" }}>{empty}</span>
        {action && <Button variant="soft" size="sm" onClick={onAction}>{action}</Button>}
      </Card>
    );
  }
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontWeight: 700, marginBottom: 6, fontSize: "var(--text-sm)" }}>{title}</div>
      <div className="row wrap spacing-2">
        {items.map((p) => (
          <div key={p.id} className="chip" onClick={() => onPick(p.id)} style={{ cursor: "pointer" }}>
            {initials(personName(p.first_name, p.last_name))} {p.first_name}
          </div>
        ))}
      </div>
    </div>
  );
}

/** فرم کوچک افزودن رابطه از صفحهٔ شخص */
function AddRelForm({ personId, familyId, onDone }: { personId: string; familyId: string; onDone: () => void }) {
  const [type, setType] = useState<"SPOUSE" | "PARENT" | "CHILD">("SPOUSE");
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [existingId, setExistingId] = useState("");
  const [newName, setNewName] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get<{ results: Person[] }>(`/search?familyId=${familyId}&limit=100`).then((d) => setPeople(d.results)).catch(() => {});
  }, [familyId]);

  async function submit() {
    if (mode === "existing" && !existingId) return;
    if (mode === "new" && !newName.trim()) return;
    setBusy(true);
    try {
      let targetId = existingId;
      if (mode === "new") {
        const { person } = await api.post<{ person: Person }>("/persons", { family_id: familyId, first_name: newName.trim(), is_living: true });
        targetId = person.id;
      }
      // type=PARENT means targetId is parent of personId; type=CHILD means targetId is child; SPOUSE is symmetric
      const from = type === "CHILD" ? targetId : personId;
      const to = type === "CHILD" ? personId : targetId;
      const relType = type === "SPOUSE" ? "SPOUSE" : type === "PARENT" ? "PARENT" : "PARENT";
      await api.post("/relationships", { family_id: familyId, person_a_id: from, person_b_id: to, relationship_type: relType });
      onDone();
    } catch (e) {
      window.alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Field label="نوع رابطه">
        <Select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
          <option value="SPOUSE">💞 همسر</option>
          <option value="PARENT">👪 والد (این فرد والدِ شخص جاری است)</option>
          <option value="CHILD">👶 فرزند (این فرد فرزندِ شخص جاری است)</option>
        </Select>
      </Field>
      <Field label="اتصال به">
        <Select value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
          <option value="existing">فرد موجود</option>
          <option value="new">فرد جدید</option>
        </Select>
      </Field>
      {mode === "existing" ? (
        <Field label="انتخاب فرد">
          <Select value={existingId} onChange={(e) => setExistingId(e.target.value)}>
            <option value="">انتخاب کنید…</option>
            {people.filter((p) => p.id !== personId).map((p) => (
              <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
            ))}
          </Select>
        </Field>
      ) : (
        <Field label="نام فرد جدید">
          <TextInput value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="نام" />
        </Field>
      )}
      <Button block onClick={submit} disabled={busy} style={{ marginTop: 8 }}>
        {busy ? "…در حال ذخیره" : "ذخیره رابطه"}
      </Button>
    </div>
  );
}

function Timeline({ person }: { person: Person }) {
  const events: Array<{ label: string; date: string }> = [];
  if (person.birth_date_text) events.push({ label: "تولد", date: person.birth_date_text });
  if (person.death_date_text) events.push({ label: "وفات", date: person.death_date_text });
  if (!events.length) return null;
  events.sort((a, b) => (a.date < b.date ? -1 : 1));
  return (
    <>
      <h3 style={{ margin: "20px 0 8px" }}>زندگی</h3>
      <Card>
        <div style={{ borderRight: "2px solid var(--border)", paddingRight: 14, display: "flex", flexDirection: "column", gap: 12 }}>
          {events.map((e, i) => (
            <div key={i} className="row" style={{ alignItems: "flex-start" }}>
              <span className="badge badge-primary" style={{ marginRight: -18, alignSelf: "flex-start" }} />
              <div>
                <div style={{ fontWeight: 700 }}>{e.label}</div>
                <div className="muted" style={{ fontSize: "var(--text-sm)" }}>{faDigits(e.date)}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

function MetaUpload({ groupId, familyId }: { groupId: string; familyId: string }) {
  const [busy, setBusy] = useState(false);
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    const fd = new FormData();
    fd.append("family_id", familyId);
    fd.append("person_id", groupId);
    fd.append("file", file);
    try {
      await api.post("/media", fd, true);
      window.location.reload();
    } catch (err) {
      window.alert((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <label className="btn btn-soft btn-sm" style={{ display: "inline-flex" }}>
      {busy ? "…آپلود" : "⬆ آپلود عکس"}
      <input type="file" accept="image/*" hidden onChange={onFile} />
    </label>
  );
}

function EditForm({ person, onSaved }: { person: Person; onSaved: () => void }) {
  const [form, setForm] = useState({
    first_name: person.first_name, last_name: person.last_name, gender: person.gender as string,
    birth_date_text: person.birth_date_text, birth_place: person.birth_place,
    death_date_text: person.death_date_text, death_place: person.death_place,
    father_name: person.father_name, mother_name: person.mother_name,
    occupation: person.occupation, residence: person.residence, education: person.education, biography: person.biography,
    is_living: person.is_living === 1,
    is_private: person.is_private === 1,
  });
  async function save() {
    try {
      await api.patch(`/persons/${person.id}`, { ...form, is_living: form.is_living });
      onSaved();
    } catch (err) {
      window.alert((err as Error).message);
    }
  }
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <div style={{ overflowY: "auto", maxHeight: "70vh" }}>
      <div className="row spacing-2">
        <div style={{ flex: 1 }}><Field label="نام"><TextInput value={form.first_name} onChange={(e) => set("first_name", e.target.value)} /></Field></div>
        <div style={{ flex: 1 }}><Field label="نام خانوادگی"><TextInput value={form.last_name} onChange={(e) => set("last_name", e.target.value)} /></Field></div>
      </div>
      <Field label="جنسیت">
        <Select value={form.gender} onChange={(e) => set("gender", e.target.value)}>
          <option value="UNKNOWN">نامشخص</option><option value="MALE">مرد</option><option value="FEMALE">زن</option>
        </Select>
      </Field>
      <Field label="نام پدر"><TextInput value={form.father_name} onChange={(e) => set("father_name", e.target.value)} /></Field>
      <Field label="نام مادر"><TextInput value={form.mother_name} onChange={(e) => set("mother_name", e.target.value)} /></Field>
      <div className="row spacing-2">
        <div style={{ flex: 1 }}><Field label="تاریخ تولد"><TextInput value={form.birth_date_text} onChange={(e) => set("birth_date_text", e.target.value)} /></Field></div>
        <div style={{ flex: 1 }}><Field label="محل تولد"><TextInput value={form.birth_place} onChange={(e) => set("birth_place", e.target.value)} /></Field></div>
      </div>
      <div className="row spacing-2">
        <div style={{ flex: 1 }}><Field label="تاریخ وفات"><TextInput value={form.death_date_text} onChange={(e) => { set("death_date_text", e.target.value); if (e.target.value) set("is_living", false); }} /></Field></div>
        <div style={{ flex: 1 }}><Field label="محل وفات"><TextInput value={form.death_place} onChange={(e) => set("death_place", e.target.value)} /></Field></div>
      </div>
      <div className="row spacing-2" style={{ alignItems: "center" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
          <input type="checkbox" checked={form.is_living} onChange={(e) => { set("is_living", e.target.checked); if (!e.target.checked && !form.death_date_text) set("death_date_text", " "); }} />
          زنده
        </label>
      </div>
      <Field label="شغل"><TextInput value={form.occupation} onChange={(e) => set("occupation", e.target.value)} /></Field>
      <Field label="محل زندگی"><TextInput value={form.residence} onChange={(e) => set("residence", e.target.value)} /></Field>
      <Field label="تحصیلات"><TextInput value={form.education} onChange={(e) => set("education", e.target.value)} /></Field>
      <Field label="زندگی‌نامه"><TextArea value={form.biography} onChange={(e) => set("biography", e.target.value)} /></Field>
      <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", marginBottom: 12 }}>
        <input type="checkbox" checked={form.is_private} onChange={(e) => set("is_private", e.target.checked)} />
        🔒 اطلاعات خصوصی
      </label>
      <Button block size="lg" onClick={save}>ذخیره تغییرات</Button>
    </div>
  );
}
