import type { Env, User } from "../env";
import { uuid } from "../util/id";
import { badRequest, notFound } from "../util/errors";
import { createProvider } from "../ai/provider";
import { GenealogyProposalSchema, businessValidate, type ValidatedProposal } from "../ai/schemas";
import { AuditService } from "./audit";

const AI_USAGE_KEY = "ai:usage:";
const RATE_LIMIT_MINUTE = 10;

export class AiService {
  private env: Env;
  private provider: ReturnType<typeof createProvider>;
  private audit: AuditService;
  constructor(env: Env) {
    this.env = env;
    this.provider = createProvider(env);
    this.audit = new AuditService(env);
  }

  /** تولید پیشنهاد از متن و ذخیره (نه اعمال) */
  async generateProposal(user: User, familyId: string, text: string) {
    if (!text?.trim()) throw badRequest("متن را وارد کنید", "EMPTY_TEXT");
    await this.rateLimit(user.id);

    const proposal = await this.provider.parseGenealogyText(text.trim());
    const parsed = GenealogyProposalSchema.safeParse(proposal);
    const validated: ValidatedProposal = parsed.success
      ? parsed.data
      : { persons: [], relationships: [] };

    // همیشه حداقل افراد از پاسخ واقعی
    const biz = businessValidate(validated);

    const recordId = uuid();
    await this.env.DB.prepare(
      "INSERT INTO ai_proposals (id, family_id, user_id, source_text, status, payload) VALUES (?, ?, ?, ?, 'PENDING', ?)"
    )
      .bind(recordId, familyId, user.id, text.trim(), JSON.stringify({ validated, warning: biz.error }))
      .run();

    await this.audit.log({ userId: user.id, entityType: "ai_proposal", entityId: recordId, action: "GENERATE" });
    await this.countUsage(user.id);

    return {
      id: recordId,
      proposal: validated,
      warning: biz.error ?? null,
      provenance: proposal.provenance ?? { source: "RULES", confidence: 0.55 },
    };
  }

  /** اعمال پیشنهاد تأییدشده در یک transaction */
  async applyProposal(user: User, familyId: string, proposalId: string) {
    const row = await this.env.DB.prepare("SELECT * FROM ai_proposals WHERE id = ? AND family_id = ?")
      .bind(proposalId, familyId).first<Record<string, unknown>>();
    if (!row) throw notFound("پیشنهاد پیدا نشد", "PROPOSAL_NOT_FOUND");
    if (row.status === "APPLIED") throw badRequest("این پیشنهاد قبلاً اعمال شده است", "ALREADY_APPLIED");

    const payload = JSON.parse(row.payload as string) as { validated: ValidatedProposal; warning?: string };
    const { validated } = payload;
    const biz = businessValidate(validated);
    if (biz.error) throw badRequest(biz.error, "INVALID_PROPOSAL");

    // transform temp → real ids
    const idMap = new Map<string, string>();
    const stmts = [];
    const auditDecl = [];

    for (const p of validated.persons) {
      const realId = uuid();
      idMap.set(p.temp_id, realId);
      stmts.push(
        this.env.DB.prepare(
          `INSERT INTO persons (id, family_id, first_name, last_name, gender, is_living, biography, created_by)
           VALUES (?, ?, ?, ?, ?, 1, ?, ?)`
        ).bind(
          realId,
          familyId,
          p.first_name ?? "",
          p.last_name ?? "",
          p.gender ?? "UNKNOWN",
          p.notes ?? "",
          user.id
        )
      );
      auditDecl.push({ entityId: realId, name: p.first_name + " " + (p.last_name ?? "") });
    }

    for (const r of validated.relationships) {
      const a = idMap.get(r.from);
      const b = idMap.get(r.to);
      if (!a || !b) continue;
      // جهت PARENT: a والدِ b است. CHILD از سمت contrari را به PARENT تبدیل می‌کنیم.
      const relType = r.type as string;
      const isParentDirection = relType === "PARENT" || relType === "CHILD";
      // برای PARENT: والد = از-سمت؛ اما اگر CHILD داده شده بود، والد = to
      const parentId = relType === "CHILD" ? b : a;
      const childId = relType === "CHILD" ? a : b;
      const pa = isParentDirection ? parentId : a;
      const pb = isParentDirection ? childId : b;
      stmts.push(
        this.env.DB.prepare(
          "INSERT INTO relationships (id, family_id, person_a_id, person_b_id, relationship_type) VALUES (?, ?, ?, ?, ?)"
        ).bind(uuid(), familyId, pa, pb, isParentDirection ? "PARENT" : relType)
      );
    }

    for (const d of auditDecl) {
      await this.audit.log({ userId: user.id, entityType: "person", entityId: d.entityId, action: "AI_APPLY", after: { name: d.name } });
    }

    await this.env.DB.batch(stmts);
    await this.env.DB.prepare("UPDATE ai_proposals SET status='APPLIED' WHERE id = ?").bind(proposalId).run();
    await this.audit.log({ userId: user.id, entityType: "ai_proposal", entityId: proposalId, action: "APPLY" });

    return { appliedPersonIds: [...idMap.values()] };
  }

  async explainRelation(familyId: string, fromId: string, toId: string, chain: string) {
    return this.provider.explainRelationship(fromId, toId, chain);
  }

  async duplicateSuggestion(familyId: string) {
    const { results } = await this.env.DB.prepare(
      "SELECT id, first_name, last_name, birth_date_text FROM persons WHERE family_id = ? ORDER BY created_at DESC LIMIT 500"
    ).bind(familyId).all<Record<string, unknown>>();
    const suggestions = [];
    const norm = (s: string) => s.replace(/[\u064A\u06CC]/g, "ی").replace(/[\u0643\u06A9]/g, "ک");
    for (let i = 0; i < results.length; i++) {
      for (let j = i + 1; j < results.length; j++) {
        const a = results[i]!;
        const b = results[j]!;
        const sameName = norm(a.last_name as string) && norm(a.last_name as string) === norm(b.last_name as string);
        if (sameName) {
          suggestions.push({
            personA: a.id as string,
            personB: b.id as string,
            confidence: 0.75,
            reason: ["هم‌نامی در نام خانوادگی"],
          });
        }
      }
    }
    return suggestions.slice(0, 50);
  }

  private async rateLimit(userId: string) {
    const key = AI_USAGE_KEY + "min:" + userId + ":" + Math.floor(Date.now() / 60000);
    const count = Number((await this.env.SESSIONS.get(key)) ?? "0"); // KV برای شمارش
    if (count >= RATE_LIMIT_MINUTE) throw badRequest("محدودیت استفاده از هوش مصنوعی را زدید؛ کمی بعد تلاش کنید", "AI_RATE_LIMIT");
    await this.env.SESSIONS.put(key, String(count + 1), { expirationTtl: 75 });
  }

  private async countUsage(userId: string) {
    const date = new Date().toISOString().slice(0, 10);
    const key = AI_USAGE_KEY + "day:" + userId + ":" + date;
    const count = Number((await this.env.SESSIONS.get(key)) ?? "0");
    await this.env.SESSIONS.put(key, String(count + 1), { expirationTtl: 48 * 3600 });
  }
}