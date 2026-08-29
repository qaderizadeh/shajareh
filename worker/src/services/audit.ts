import type { Env } from "../env";

export class AuditService {
  constructor(private env: Env) {}

  async log(params: {
    userId?: string;
    entityType: string;
    entityId: string;
    action: string;
    before?: unknown;
    after?: unknown;
  }): Promise<void> {
    await this.env.DB.prepare(
      "INSERT INTO audit_logs (user_id, entity_type, entity_id, action, before, after) VALUES (?, ?, ?, ?, ?, ?)"
    )
      .bind(
        params.userId ?? null,
        params.entityType,
        params.entityId,
        params.action,
        params.before ? JSON.stringify(params.before) : null,
        params.after ? JSON.stringify(params.after) : null
      )
      .run();
  }

  async recent(userId?: string, limit = 20) {
    const base = "SELECT * FROM audit_logs";
    const where = userId ? " WHERE user_id = ?" : "";
    const { results } = await this.env.DB.prepare(base + where + " ORDER BY id DESC LIMIT ?")
      .bind(...(userId ? [userId, limit] : [limit]))
      .all<Record<string, unknown>>();
    return results.map((r) => ({
      id: r.id as number,
      user_id: r.user_id as string | null,
      entity_type: r.entity_type as string,
      entity_id: r.entity_id as string,
      action: r.action as string,
      before: r.before ? JSON.parse(r.before as string) : null,
      after: r.after ? JSON.parse(r.after as string) : null,
      created_at: r.created_at as string,
    }));
  }
}