import { useState, type FormEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useActiveFamily } from "../activeFamily";
import { Button, Card, Field, TextArea, TextInput } from "../components/ui";
import { api } from "../lib/api";

interface ProgressStep {
  label: string;
  done: boolean;
}
function StepRow({ steps }: { steps: ProgressStep[] }) {
  return (
    <div className="row spacing-1" style={{ marginBottom: 24, flexWrap: "wrap" }}>
      {steps.map((s, i) => (
        <span key={i} className="badge" style={{ color: s.done ? "var(--primary)" : "var(--muted-strong)" }}>
          {s.done ? "✓" : "○"} {s.label}
        </span>
      ))}
    </div>
  );
}

export default function OnboardingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setFamilyId, refresh } = useActiveFamily();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) return setError("نام خانواده را وارد کنید.");
    setBusy(true);
    try {
      const { family } = await api.post<{ family: { id: string } }>("/families", { name, description });
      setFamilyId(family.id);
      await refresh();
      const createPerson = (location.state as { createPerson?: boolean })?.createPerson;
      if (createPerson) navigate("/persons/new");
      else navigate("/");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 460 }}>
      <h1 className="page-title">ساخت خانواده</h1>
      <p className="page-sub">در کمتر از چند دقیقه اولین شجره‌ات را می‌سازی. 🌱</p>

      <Card style={{ marginBottom: 16 }}>
        <StepRow
          steps={[
            { label: "ساخت خانواده", done: false },
            { label: "ثبت خودت", done: false },
            { label: "ثبت والدین", done: false },
            { label: "دیدن شجره", done: false },
          ]}
        />
        <form onSubmit={submit}>
          <Field label="نام خانواده">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً خانواده قادری" />
          </Field>
          <Field label="توضیح کوتاه (دلخواه)">
            <TextArea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="مثلاً ساکن پاوه، از ایل جاف…" />
          </Field>
          {error && <div style={{ marginBottom: 14, background: "var(--danger-soft)", color: "var(--danger)", padding: "10px 12px", borderRadius: 8, fontSize: "var(--text-sm)" }}>{error}</div>}
          <Button type="submit" block size="lg" disabled={busy}>
            {busy ? "…در حال ایجاد" : "ایجاد خانواده و ادامه"}
          </Button>
        </form>
      </Card>
    </div>
  );
}