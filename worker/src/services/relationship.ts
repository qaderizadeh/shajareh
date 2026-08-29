import type { Env, RelationshipType, User } from "../env";
import { uuid } from "../util/id";
import { badRequest, notFound } from "../util/errors";
import { AuditService } from "./audit";

export interface RelEdge {
  id: string;
  type: RelationshipType;
  /** برای PARENT: a والدِ b است. برای بقیه: متقارن است. */
  a: string;
  b: string;
}

export interface PersonNode {
  id: string;
  first_name: string;
  last_name: string;
  gender: string;
  is_living: number;
  birth_date_text: string;
  death_date_text: string;
  birth_year_min: number | null;
  birth_place: string;
}

export class RelationshipService {
  private env: Env;
  private audit: AuditService;
  constructor(env: Env) {
    this.env = env;
    this.audit = new AuditService(env);
  }

  /** خواندن همهٔ رابطه‌های یک خانواده و ساخت index متقارن */
  async loadGraph(familyId: string): Promise<{ edges: RelEdge[]; persons: PersonNode[] }> {
    const batch = await this.env.DB.batch([
      this.env.DB.prepare(
        "SELECT id, person_a_id, person_b_id, relationship_type FROM relationships WHERE family_id = ?"
      ).bind(familyId),
      this.env.DB.prepare(
        "SELECT id, first_name, last_name, gender, is_living, birth_date_text, death_date_text, birth_year_min, birth_place FROM persons WHERE family_id = ?"
      ).bind(familyId),
    ]);
    const relRows = (batch[0]?.results ?? []) as Array<Record<string, unknown>>;
    const peopleRows = (batch[1]?.results ?? []) as Array<Record<string, unknown>>;

    const edges: RelEdge[] = relRows.map((r) => ({
      id: r.id as string,
      type: r.relationship_type as RelationshipType,
      a: r.person_a_id as string,
      b: r.person_b_id as string,
    }));
    const persons = peopleRows.map((r) => ({
      id: r.id as string,
      first_name: r.first_name as string,
      last_name: r.last_name as string,
      gender: r.gender as string,
      is_living: Number(r.is_living ?? 1),
      birth_date_text: (r.birth_date_text as string) ?? "",
      death_date_text: (r.death_date_text as string) ?? "",
      birth_year_min: (r.birth_year_min as number | null) ?? null,
      birth_place: (r.birth_place as string) ?? "",
    }));
    return { edges, persons };
  }

  private index(edges: RelEdge[]) {
    const parentsOf = new Map<string, string[]>();
    const childrenOf = new Map<string, string[]>();
    const spousesOf = new Map<string, string[]>();
    const siblingsOf = new Map<string, string[]>();
    const byPerson = new Map<string, string[]>();
    const add = (map: Map<string, string[]>, k: string, v: string) => {
      const arr = map.get(k) ?? [];
      if (!arr.includes(v)) arr.push(v);
      map.set(k, arr);
    };
    for (const e of edges) {
      add(byPerson, e.a, e.b);
      add(byPerson, e.b, e.a);
      if (e.type === "PARENT") {
        add(parentsOf, e.b, e.a);
        add(childrenOf, e.a, e.b);
      } else if (e.type === "CHILD") {
        add(parentsOf, e.a, e.b);
        add(childrenOf, e.b, e.a);
      } else if (e.type === "SPOUSE" || e.type === "PARTNER") {
        add(spousesOf, e.a, e.b);
        add(spousesOf, e.b, e.a);
      } else if (e.type === "SIBLING") {
        add(siblingsOf, e.a, e.b);
        add(siblingsOf, e.b, e.a);
      }
    }
    return { parentsOf, childrenOf, spousesOf, siblingsOf, byPerson };
  }

  async add(user: User, familyId: string, input: { person_a_id: string; person_b_id: string; relationship_type: RelationshipType; notes?: string }) {
    const { a, b, type } = { a: input.person_a_id, b: input.person_b_id, type: input.relationship_type };
    if (a === b) throw badRequest("یک فرد نمی‌تواند با خودش رابطه داشته باشد", "SELF_RELATION");
    if (!["PARENT", "CHILD", "SPOUSE", "PARTNER", "SIBLING"].includes(type)) throw badRequest("نوع رابطه نامعتبر است", "BAD_RELATION");
    for (const id of [a, b]) {
      const p = await this.env.DB.prepare("SELECT id FROM persons WHERE id = ? AND family_id = ?").bind(id, familyId).first();
      if (!p) throw notFound("یکی از افراد پیدا نشد", "PERSON_NOT_FOUND");
    }

    // نرمال‌سازی: رابطهٔ والدین/فرزند همیشه به‌صورت PARENT ذخیره شود (a والد، b فرزند)
    let ra = a, rb = b, rtype = type;
    if (type === "CHILD") {
      ra = b; rb = a; rtype = "PARENT";
    }
    // جلوگیری از تکرار
    if (rtype === "PARENT") {
      const dup = await this.env.DB.prepare(
        "SELECT id FROM relationships WHERE family_id=? AND person_a_id=? AND person_b_id=? AND relationship_type='PARENT'"
      ).bind(familyId, ra, rb).first();
      if (dup) throw badRequest("این رابطه قبلاً ثبت شده است", "DUP_RELATION");
    } else {
      const dup = await this.env.DB.prepare(
        "SELECT id FROM relationships WHERE family_id=? AND ((person_a_id=? AND person_b_id=?) OR (person_a_id=? AND person_b_id=?)) AND relationship_type=?"
      ).bind(familyId, ra, rb, rb, ra, rtype).first();
      if (dup) throw badRequest("این رابطه قبلاً ثبت شده است", "DUP_RELATION");
    }

    const id = uuid();
    await this.env.DB.prepare(
      "INSERT INTO relationships (id, family_id, person_a_id, person_b_id, relationship_type, notes) VALUES (?,?,?,?,?,?)"
    ).bind(id, familyId, ra, rb, rtype, input.notes?.trim() ?? "").run();
    await this.audit.log({ userId: user.id, entityType: "relationship", entityId: id, action: "CREATE", after: { a: ra, b: rb, type: rtype } });
    return this.graph(familyId);
  }

  async remove(user: User, familyId: string, id: string) {
    await this.env.DB.prepare("DELETE FROM relationships WHERE id = ? AND family_id = ?").bind(id, familyId).run();
    await this.audit.log({ userId: user.id, entityType: "relationship", entityId: id, action: "DELETE" });
  }

  /** graph کامل خانواده (با محدودیت عمق برای حفظ کارایی) */
  async graph(familyId: string, opts: { maxNodes?: number } = {}) {
    const { edges, persons } = await this.loadGraph(familyId);
    const { parentsOf, childrenOf, spousesOf, byPerson } = this.index(edges);
    return {
      persons,
      links: byPerson,
      parentMap: parentsOf,
      childMap: childrenOf,
      spouseMap: spousesOf,
    };
  }

  /** نیاکان (ancestors) یک فرد */
  async ancestors(familyId: string, personId: string, maxDepth = 8) {
    const { edges, persons } = await this.loadGraph(familyId);
    const { parentsOf } = this.index(edges);
    const byId = new Map(persons.map((p) => [p.id, p]));
    const seen = new Set<string>([personId]);
    const result: PersonNode[] = [];
    const stack: Array<[string, number]> = [[personId, 0]];
    while (stack.length) {
      const [current, depth] = stack.pop()!;
      if (depth > maxDepth) continue;
      const parents = parentsOf.get(current) ?? [];
      for (const p of parents) {
        if (seen.has(p)) continue;
        seen.add(p);
        const node = byId.get(p);
        if (node) { result.push(node); stack.push([p, depth + 1]); }
      }
    }
    return { persons: result, rootId: personId };
  }

  /** نسل‌ها (descendants) و view خانواده از یک فرد */
  async familyView(familyId: string, personId: string, maxDepth = 6) {
    const { edges, persons } = await this.loadGraph(familyId);
    const { childrenOf, parentsOf, spousesOf } = this.index(edges);
    const byId = new Map(persons.map((p) => [p.id, p]));
    if (!byId.has(personId)) throw notFound("شخص پیدا نشد", "PERSON_NOT_FOUND");

    // نسل صفر: خود فرد + والدین + همسران؛ سپس نسل‌های بعد فقط فرزندان
    const seen = new Set<string>([personId]);
    const include = (id: string) => { if (id && !seen.has(id)) seen.add(id); };
    const parentIds = parentsOf.get(personId) ?? [];
    const spouseIds = spousesOf.get(personId) ?? [];
    parentIds.forEach(include);
    spouseIds.forEach(include);
    const gen0 = [...new Set([personId, ...parentIds, ...spouseIds])];

    const generations: string[][] = [gen0];
    let current = gen0;
    let depth = 0;
    while (current.length && depth < maxDepth) {
      const next: string[] = [];
      for (const id of current) {
        for (const c of childrenOf.get(id) ?? []) {
          if (!seen.has(c)) { seen.add(c); next.push(c); }
        }
      }
      if (next.length) generations.push(next);
      current = next;
      depth++;
    }

    const nodeList = [...seen].map((id) => byId.get(id)!).filter(Boolean);
    return {
      rootId: personId,
      persons: nodeList,
      generations: generations.map((gen) => gen.map((id) => byId.get(id)!).filter(Boolean)),
      spouseMap: spousesOf,
      childMap: childrenOf,
    };
  }

  /** مسیر و توضیح رابطهٔ دو فرد */
  async relationshipPath(familyId: string, fromId: string, toId: string) {
    const { edges, persons } = await this.loadGraph(familyId);

    // فهرست مجاورت با نوع رابطه
    const adj = new Map<string, Array<{ to: string; type: RelationshipType }>>();
    for (const e of edges) {
      const push = (src: string, dst: string, type: RelationshipType) => {
        const arr = adj.get(src) ?? [];
        if (!arr.find((x) => x.to === dst)) arr.push({ to: dst, type });
        adj.set(src, arr);
      };
      if (e.type === "PARENT") {
        push(e.a, e.b, "PARENT"); // a والدِ b
        push(e.b, e.a, "CHILD");
      } else if (e.type === "CHILD") {
        push(e.b, e.a, "PARENT");
        push(e.a, e.b, "CHILD");
      } else {
        push(e.a, e.b, e.type);
        push(e.b, e.a, e.type);
      }
    }

    const byId = new Map(persons.map((p) => [p.id, p]));
    if (!byId.has(fromId) || !byId.has(toId)) throw notFound("شخص پیدا نشد", "PERSON_NOT_FOUND");
    if (fromId === toId) {
      const p = byId.get(fromId)!;
      return { path: [p], explain: `${p.first_name} خودِ همین فرد است.` };
    }

    // BFS
    const prev = new Map<string, { node: string; type: RelationshipType } | null>();
    const visited = new Set<string>([fromId]);
    const queue = [fromId];
    prev.set(fromId, null);
    let found = false;
    while (queue.length) {
      const cur = queue.shift()!;
      if (cur === toId) { found = true; break; }
      for (const n of adj.get(cur) ?? []) {
        if (!visited.has(n.to)) {
          visited.add(n.to);
          prev.set(n.to, { node: cur, type: n.type });
          queue.push(n.to);
        }
      }
    }
    if (!found) throw notFound("مسیر رابطه‌ای بین این دو نفر پیدا نشد", "NO_PATH");

    const pathNodes: PersonNode[] = [];
    const stepTypes: RelationshipType[] = [];
    let cur: string | null = toId;
    while (cur) {
      const p = byId.get(cur);
      if (p) pathNodes.push(p);
      const back = prev.get(cur);
      if (back && back.node) stepTypes.push(back.type); // نوع رابطهٔ back.node ← cur
      cur = back ? back.node : null;
    }
    pathNodes.reverse();
    stepTypes.reverse();

    return { path: pathNodes, explain: this.describeRelation(pathNodes, stepTypes, fromId, toId) };
  }

  private describeRelation(path: PersonNode[], steps: RelationshipType[], fromId: string, toId: string): string {
    const name = (p: PersonNode | undefined) => (p ? `${p.first_name}` : "");
    const from = path.find((p) => p.id === fromId);
    const to = path.find((p) => p.id === toId);
    if (!from || !to || path.length < 2) return "رابطه شناسایی نشد.";
    const gender = (p: PersonNode) => (p.gender === "FEMALE" ? "خواهر" : "برادر");

    // اگر دقیقاً یک گام فاصله دارند
    if (path.length === 2 && steps.length === 1) {
      const s = steps[0];
      if (s === "PARENT") return `${name(to)} فرزندِ ${name(from)} است.`;
      if (s === "CHILD") return `${name(from)} فرزندِ ${name(to)} است.`;
      if (s === "SPOUSE" || s === "PARTNER") return `${name(from)} و ${name(to)} همسران یکدیگرند.`;
      if (s === "SIBLING") return `${name(from)} و ${name(to)} خواهر/برادر یکدیگرند.`;
    }

    // دو گام: پدربزرگ/مادربزرگ یا خواهر/برادرزاده
    if (path.length === 3 && steps.length === 2) {
      const [, mid] = path;
      const [s1, s2] = steps;
      // پدربزرگ/مادربزرگ: نسبت به from، mid پدر، و to پدربزرگ
      if (s1 === "PARENT" && s2 === "PARENT") {
        const ancestorGen = gender(mid!);
        return `${name(to)} ${ancestorGen}ِ ${name(from)} است (${name(mid)} ${ancestorGen}ِ او است).`;
      }
      if (s1 === "PARENT" && s2 === "SPOUSE" || s1 === "SPOUSE" && s2 === "PARENT") {
        return `${name(to)} همسرِ ${name(mid)} (والدِ ${name(from)}) است.`;
      }
    }

    // general
    const chain = path.map((p) => name(p)).filter(Boolean).join(" → ");
    return `${name(from)} با ${name(to)} از مسیر ${chain} مرتبط است.`;
  }
}