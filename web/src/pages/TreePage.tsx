import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useActiveFamily } from "../activeFamily";
import { api } from "../lib/api";
import { Button, BottomSheet, EmptyState, ErrorState, LoadingState, Select } from "../components/ui";
import { faDigits, lifeSpan, personName } from "../lib/format";
import type { PersonGraphNode } from "../lib/types";
import "../components/tree.css";

interface FamilyView {
  rootId: string;
  persons: PersonGraphNode[];
  generations: PersonGraphNode[][];
  childMap: Record<string, string[]>;
  spouseMap: Record<string, string[]>;
}

export default function TreePage() {
  const [params] = useSearchParams();
  const { familyId } = useActiveFamily();
  const navigate = useNavigate();
  const [view, setView] = useState<FamilyView | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [selected, setSelected] = useState<PersonGraphNode | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [empty, setEmpty] = useState(false);
  const [root, setRoot] = useState<string | null>(() => {
    const r = params.get("root");
    return r && r !== "auto" ? r : null;
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        let rootId = root;
        if (!rootId && familyId) {
          const f = await api.get<{ rootId: string | null }>(`/families/${familyId}`);
          rootId = f.rootId ?? null;
        }
        if (!rootId) {
          if (!cancelled) setEmpty(true);
          setLoading(false);
          return;
        }
        setEmpty(false);
        const fv = await api.get<FamilyView>(`/persons/${rootId}/family`);
        if (!cancelled) { setView(fv); setRoot(rootId); }
      } catch (e) {
        if (!cancelled) setErr((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [root, familyId]);

  const byId = useMemo(() => new Map((view?.persons ?? []).map((p) => [p.id, p])), [view]);
  const roots = useMemo(() => {
    if (!view) return [];
    const hasParent = new Set<string>();
    for (const kids of Object.values(view.childMap)) kids.forEach((k) => hasParent.add(k));
    return view.persons.filter((p) => !hasParent.has(p.id) && (view.childMap[p.id]?.length ?? 0) > 0);
  }, [view]);

  function pickRoot(id: string) {
    setRoot(id);
    setCollapsed(new Set());
  }

  if (loading) return <LoadingState label="در حال کشیدن درخت…" />;
  if (err) return <ErrorState message={err} onRetry={() => window.location.reload()} />;
  if (empty || !view || view.persons.length === 0) {
    return (
      <EmptyState
        icon="🌳"
        title="شجره هنوز خالی است"
        hint="اولین نفر را اضافه کن یا داستان خانواده‌ات را با هوش مصنوعی بساز تا درخت شکل بگیرد."
        actions={
          <>
            <Button onClick={() => navigate("/persons/new")}>افزودن نفر</Button>
            <Button variant="soft" onClick={() => navigate("/ai")}>✨ ساخت با هوش مصنوعی</Button>
          </>
        }
      />
    );
  }

  const rootNode = byId.get(root ?? view.rootId ?? view.persons[0]!.id);

  return (
    <div>
      <div className="row justify-between" style={{ marginBottom: 6, flexWrap: "wrap" }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>شجره خانواده</h1>
      </div>
      <p className="page-sub">برای انتخاب فرد روی هر نام بزن؛ برای جمع تم، روی فرزند سبز بزن.</p>

      <div className="tree-card" style={{ background: "var(--surface)", borderRadius: "var(--radius-lg)", border: "var(--hairline)", padding: "var(--space-4)" }}>
        {/* انتخاب ریشه */}
        {roots.length > 1 && (
          <div className="tree-toolbar">
            <Select value={rootNode?.id ?? ""} onChange={(e) => pickRoot(e.target.value)} style={{ maxWidth: "100%" }}>
              {roots.map((r) => (
                <option key={r.id} value={r.id}>{personName(r.first_name, r.last_name)}</option>
              ))}
            </Select>
            <div className="tree-legend" style={{ marginTop: 4 }}>برای تغییر ریشه، یک نفر بدون والد را انتخاب کن.</div>
          </div>
        )}

        <div className="tree-root">
          {rootNode && <TreeBranch node={rootNode} childMap={view.childMap} byId={byId} collapsed={collapsed} onSelect={setSelected} depth={0} />}
        </div>
      </div>

      {roots.length === 0 && <p className="tree-legend" style={{ marginTop: 8 }}>هنوز فرزندی ثبت نشده تا درخت کامل شود.</p>}

      <BottomSheet open={!!selected} title={selected ? personName(selected.first_name, selected.last_name) : ""} onClose={() => setSelected(null)}>
        {selected && (
          <div>
            <div style={{ marginBottom: 6 }} className="muted">{lifeSpan(selected)}</div>
            <div className="row wrap spacing-2" style={{ marginTop: 8 }}>
              <Button onClick={() => navigate(`/persons/${selected.id}`)}>مشاهده پروفایل</Button>
              <Button variant="secondary" onClick={() => { setCollapsed((c) => { const n = new Set(c); n.has(selected.id) ? n.delete(selected.id) : n.add(selected.id); return n; }); setSelected(null); }}>
                {collapsed.has(selected.id) ? "گسترش فرزندان" : "جمع فرزندان"}
              </Button>
              <Button variant="soft" size="sm" onClick={() => { pickRoot(selected.id); setSelected(null); }}>🎯 ریشه درخت</Button>
            </div>
            <div style={{ marginTop: 14 }} className="tree-legend">
              {selected.birth_place && `محل تولد: ${selected.birth_place} · `}
              {faDigits(selected.birth_year_min ? `${selected.birth_year_min} (حدود)` : "")}
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}

function TreeBranch({ node, childMap, byId, collapsed, onSelect, depth }: {
  node: PersonGraphNode;
  childMap: Record<string, string[]>;
  byId: Map<string, PersonGraphNode>;
  collapsed: Set<string>;
  onSelect: (p: PersonGraphNode) => void;
  depth: number;
}) {
  const kids = (childMap[node.id] ?? []).map((k) => byId.get(k)).filter(Boolean) as PersonGraphNode[];
  const isCollapsed = collapsed.has(node.id);
  const alive = node.is_living === 1;

  return (
    <div className="tree-branch">
      <div className={`tree-node ${isCollapsed ? "selected" : ""}`} onClick={() => onSelect(node)}>
        <div className="tn-name">{node.first_name}{node.last_name ? ` ${node.last_name}` : ""}</div>
        {(node.birth_date_text || node.death_date_text) && <div className="tn-dates">{lifeSpan(node)}</div>}
        <div className="tn-live">{alive ? "زنده" : ""}{kids.length > 0 ? ` · ${kids.length} فرزند` : ""}</div>
      </div>
      {kids.length > 0 && !isCollapsed && (
        <>
          <div className="tree-connector" />
          <div className="tree-children">
            {kids.map((k) => (
              <TreeBranch key={k.id} node={k} childMap={childMap} byId={byId} collapsed={collapsed} onSelect={onSelect} depth={depth + 1} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}