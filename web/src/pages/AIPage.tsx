import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useActiveFamily } from "../activeFamily";
import { api } from "../lib/api";
import { Button, Card, EmptyState, Modal, TextArea, useToast } from "../components/ui";
import type { AIProposal, ProposalPerson } from "../lib/types";
import { genderLabel } from "../lib/format";

const EXAMPLE = `پدربزرگ من احمد قادری بود. حدود سال ۱۳۰۰ در پاوه به دنیا آمد.
همسرش خدیجه بود. آن‌ها چهار فرزند داشتند: محمد، علی، حسن و مریم.
محمد با فاطمه ازدواج کرد.`;

export default function AIPage() {
  const { familyId } = useActiveFamily();
  const navigate = useNavigate();
  const toast = useToast();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [proposal, setProposal] = useState<AIProposal | null>(null);
  const [applying, setApplying] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    setError("");
    if (!familyId) return setError("ابتدا یک خانواده بسازید (از خانه).");
    if (text.trim().length < 5) return setError("متن داستان کوتاه است؛ کمی بیشتر بنویس.");
    setBusy(true);
    try {
      const r = await api.post<AIProposal>("/ai/propose", { family_id: familyId, text });
      setProposal(r);
      if (!r.warning && r.proposal.persons.length === 0) setError("هیچ فردی از متن استخراج نشد؛ دقت متن را بالا ببر.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function apply() {
    if (!proposal) return;
    setApplying(true);
    try {
      await api.post(`/ai/proposals/${proposal.id}/apply`, {});
      toast.push("شجره با هوش مصنوعی ساخته شد 🌳", "success");
      setConfirmOpen(false);
      setProposal(null);
      navigate("/tree?root=auto");
    } catch (e) {
      setError((e as Error).message);
      setConfirmOpen(false);
    } finally {
      setApplying(false);
    }
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <h1 className="page-title">ساخت شجره با هوش مصنوعی</h1>
      <p className="page-sub">داستان خانواده‌ات را بنویس؛ هوش مصنوعی افراد و روابط را استخراج می‌کند و تو پیش از ثبت، تأیید می‌کنی.</p>

      <Card>
        <TextArea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={EXAMPLE}
          style={{ minHeight: 160 }}
          aria-label="متن داستان خانواده"
        />
        <div className="row justify-between wrap spacing-2" style={{ marginTop: 12 }}>
          <Button type="button" variant="ghost" size="sm" onClick={() => setText(EXAMPLE)}>استفاده از نمونه</Button>
          <Button onClick={run} size="lg" disabled={busy || !familyId}>
            {busy ? "✨ در حال استخراج…" : "✨ استخراج شجره"}
          </Button>
        </div>
        {error && <div style={{ marginTop: 10, background: "var(--danger-soft)", color: "var(--danger)", padding: "10px 12px", borderRadius: 8, fontSize: "var(--text-sm)" }}>{error}</div>}
      </Card>

      {proposal && (
        <Card style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 8 }}>اطلاعاتی که از متن تو استخراج شد</h3>
          {proposal.provenance && (
            <div className="badge badge-accent" style={{ marginBottom: 12 }}>
              {proposal.provenance.source === "AI" ? "استخراج‌شده از متن شما" : "استخراج قاعده‌محور — احتمال خطا دارد"} {proposal.provenance.confidence && `· حدود ${Math.round(proposal.provenance.confidence * 100)}٪`}
            </div>
          )}

          {proposal.warning && <div style={{ marginBottom: 12, background: "var(--warning-soft)", color: "var(--warning)", padding: "10px 12px", borderRadius: 8, fontSize: "var(--text-sm)" }}>{proposal.warning}</div>}

          {/* افراد */}
          {proposal.proposal.persons.map((p) => (
            <PersonPreview key={p.temp_id} p={p} />
          ))}

          {/* روابط */}
          {proposal.proposal.relationships.length > 0 && (
            <>
              <h4 style={{ margin: "14px 0 6px", fontSize: "var(--text-base)" }}>روابط</h4>
              <div className="col spacing-1">
                {proposal.proposal.relationships.map((r, i) => {
                  const a = findPerson(proposal, r.from);
                  const b = findPerson(proposal, r.to);
                  return <div key={i} className="muted" style={{ fontSize: "var(--text-sm)" }}>• {relText(r.type, a, b)}</div>;
                })}
              </div>
            </>
          )}

          <div className="row wrap spacing-2" style={{ marginTop: 16 }}>
            <Button onClick={() => proposal.proposal.persons.length > 0 && setConfirmOpen(true)} disabled={proposal.proposal.persons.length === 0} block>
              تأیید و ثبت شجره
            </Button>
            <Button variant="secondary" block onClick={() => setProposal(null)}>لغو</Button>
          </div>
        </Card>
      )}

      <Modal open={confirmOpen} title="تأیید نهایی" onClose={() => setConfirmOpen(false)}>
        <p>
          {proposal?.proposal.persons.length} نفر و {proposal?.proposal.relationships.length} رابطه به شجره اضافه خواهد شد.
          این عمل در یک تراکنش ثبت می‌شود و قابل بازگشت نیست (ولی می‌توانی حذف‌شان کنی).
        </p>
        <div className="row spacing-2" style={{ marginTop: 16 }}>
          <Button onClick={apply} disabled={applying}>{applying ? "…در حال ثبت" : "تأیید و ثبت"}</Button>
          <Button variant="secondary" onClick={() => setConfirmOpen(false)}>بازگشت</Button>
        </div>
      </Modal>

      {!familyId && <EmptyState icon="🌱" title="اول خانواده بساز" hint="برای استفاده از هوش مصنوعی، ابتدا از صفحهٔ خانه یک خانواده بساز." />}
    </div>
  );
}

function PersonPreview({ p }: { p: ProposalPerson }) {
  return (
    <div className="list-item" style={{ cursor: "default" }}>
      <div className="avatar" style={{ width: 40, height: 40, fontSize: "var(--text-sm)" }}>{p.first_name?.[0] ?? "؟"}</div>
      <div className="grow">
        <div style={{ fontWeight: 600 }}>{p.first_name} {p.last_name ?? ""}</div>
        <div className="muted" style={{ fontSize: "var(--text-xs)" }}>
          {genderLabel(p.gender)} {p.birth_date_text ? `· متولد ${p.birth_date_text}` : ""} {p.birth_place ? `· ${p.birth_place}` : ""} {p.is_narrator ? "· راوی" : ""}
        </div>
      </div>
    </div>
  );
}

function findPerson(proposal: AIProposal, tempId: string): ProposalPerson | undefined {
  return proposal.proposal.persons.find((p) => p.temp_id === tempId);
}

function relText(type: string, a?: ProposalPerson, b?: ProposalPerson): string {
  const an = a?.first_name ?? "؟";
  const bn = (b?.first_name ?? "؟") + (b?.last_name ? ` ${b.last_name}` : "");
  switch (type) {
    case "PARENT": return `${an} والدِ ${bn} است.`;
    case "SPOUSE": return `${an} و ${bn} همسران‌اند.`;
    case "PARTNER": return `${an} و ${bn} شریک‌اند.`;
    case "SIBLING": return `${an} و ${bn} خواهر/برادرند.`;
    case "CHILD": return `${an} فرزندِ ${bn} است.`;
    default: return `${an} — ${bn}`;
  }
}