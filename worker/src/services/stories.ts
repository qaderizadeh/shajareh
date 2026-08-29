import type { Env, User } from "../env";
import { uuid } from "../util/id";
import { badRequest, notFound } from "../util/errors";
import { AuditService } from "./audit";

export interface StoryInput {
  title: string;
  body?: string;
  person_id?: string;
  date_text?: string;
  location?: string;
}

export class StoriesService {
  private env: Env;
  private audit: AuditService;
  constructor(env: Env) {
    this.env = env;
    this.audit = new AuditService(env);
  }

  async create(user: User, familyId: string, input: StoryInput) {
    if (!input.title?.trim()) throw badRequest("عنوان داستان را وارد کنید", "INVALID_TITLE");
    const id = uuid();
    await this.env.DB.prepare(
      `INSERT INTO stories (id, family_id, person_id, title, body, date_text, location, created_by)
       VALUES (?,?,?,?,?,?,?,?)`
    )
      .bind(id, familyId, input.person_id || null, input.title.trim(), input.body?.trim() || "", input.date_text?.trim() || "", input.location?.trim() || "", user.id)
      .run();
    await this.audit.log({ userId: user.id, entityType: "story", entityId: id, action: "CREATE", after: { title: input.title } });
    return this.get(familyId, id);
  }

  async get(familyId: string, id: string) {
    const row = await this.env.DB.prepare("SELECT * FROM stories WHERE id = ? AND family_id = ?").bind(id, familyId).first();
    if (!row) throw notFound("داستان پیدا نشد", "STORY_NOT_FOUND");
    return row;
  }

  async list(familyId: string, personId?: string) {
    if (personId) {
      const { results } = await this.env.DB.prepare(
        "SELECT * FROM stories WHERE family_id = ? AND person_id = ? ORDER BY created_at DESC"
      ).bind(familyId, personId).all<Record<string, unknown>>();
      return results;
    }
    const { results } = await this.env.DB.prepare(
      "SELECT * FROM stories WHERE family_id = ? ORDER BY created_at DESC"
    ).bind(familyId).all<Record<string, unknown>>();
    return results;
  }

  async update(user: User, familyId: string, id: string, input: StoryInput) {
    const existing = await this.get(familyId, id);
    await this.env.DB.prepare(
      `UPDATE stories SET title=?, body=?, person_id=?, date_text=?, location=?, updated_at=datetime('now')
       WHERE id=? AND family_id=?`
    )
      .bind(input.title?.trim() || (existing.title as string), input.body?.trim() ?? (existing.body as string), input.person_id || existing.person_id, input.date_text?.trim() ?? (existing.date_text as string), input.location?.trim() ?? (existing.location as string), id, familyId)
      .run();
    await this.audit.log({ userId: user.id, entityType: "story", entityId: id, action: "UPDATE", before: existing, after: input });
    return this.get(familyId, id);
  }

  async remove(user: User, familyId: string, id: string) {
    const existing = await this.get(familyId, id);
    await this.env.DB.prepare("DELETE FROM stories WHERE id = ? AND family_id = ?").bind(id, familyId).run();
    await this.audit.log({ userId: user.id, entityType: "story", entityId: id, action: "DELETE", before: existing });
  }
}
