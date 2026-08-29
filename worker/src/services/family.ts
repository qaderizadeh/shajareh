import type { Env, User } from "../env";
import { uuid } from "../util/id";
import { badRequest, notFound } from "../util/errors";
import { AuditService } from "./audit";

export interface FamilySummary {
  id: string;
  name: string;
  description: string | null;
  role: "ADMIN" | "EDITOR" | "VIEWER";
  persons_count: number;
  members_count: number;
}

export interface FamilyStats {
  persons: number;
  generations: number;
  media: number;
  spouses: number;
}

export class FamilyService {
  private env: Env;
  private audit: AuditService;
  constructor(env: Env) {
    this.env = env;
    this.audit = new AuditService(env);
  }

  async create(user: User, name: string, description?: string) {
    if (!name?.trim()) throw badRequest("نام خانواده را وارد کنید", "INVALID_NAME");
    const familyId = uuid();
    const tx = [
      this.env.DB.prepare("INSERT INTO families (id, name, description, created_by) VALUES (?, ?, ?, ?)")
        .bind(familyId, name.trim(), description?.trim() || null, user.id),
      this.env.DB.prepare(
        "INSERT INTO family_memberships (id, family_id, user_id, role) VALUES (?, ?, ?, 'ADMIN')"
      ).bind(uuid(), familyId, user.id),
    ];
    await this.env.DB.batch(tx);
    await this.audit.log({ userId: user.id, entityType: "family", entityId: familyId, action: "CREATE", after: { name } });
    return this.get(familyId);
  }

  async listForUser(user: User): Promise<FamilySummary[]> {
    const { results } = await this.env.DB.prepare(
      `SELECT f.id, f.name, f.description, m.role,
              (SELECT COUNT(*) FROM persons p WHERE p.family_id = f.id) AS persons_count,
              (SELECT COUNT(*) FROM family_memberships mm WHERE mm.family_id = f.id AND mm.status='ACTIVE') AS members_count
       FROM families f
       JOIN family_memberships m ON m.family_id = f.id
       WHERE m.user_id = ? AND m.status = 'ACTIVE'
       ORDER BY f.created_at DESC`
    ).bind(user.id).all<Record<string, unknown>>();
    return results.map((r) => ({
      id: r.id as string,
      name: r.name as string,
      description: (r.description as string) || null,
      role: r.role as FamilySummary["role"],
      persons_count: Number(r.persons_count ?? 0),
      members_count: Number(r.members_count ?? 0),
    }));
  }

  async get(familyId: string) {
    const row = await this.env.DB.prepare("SELECT * FROM families WHERE id = ?").bind(familyId).first();
    if (!row) throw notFound("خانواده پیدا نشد", "FAMILY_NOT_FOUND");
    return row;
  }

  async stats(familyId: string): Promise<FamilyStats> {
    const q = await this.env.DB.batch([
      this.env.DB.prepare("SELECT COUNT(*) c FROM persons WHERE family_id = ?").bind(familyId),
      this.env.DB.prepare(
        "SELECT COUNT(DISTINCT birth_year_min) g FROM persons WHERE family_id = ? AND birth_year_min IS NOT NULL"
      ).bind(familyId),
      this.env.DB.prepare("SELECT COUNT(*) c FROM media WHERE family_id = ?").bind(familyId),
      this.env.DB.prepare(
        "SELECT COUNT(*) c FROM relationships WHERE family_id = ? AND relationship_type IN ('SPOUSE','PARTNER')"
      ).bind(familyId),
    ]);
    const num = (arr: unknown[], i: number) => Number(((arr[i] as { c?: number }[]) ?? [])[0]?.c ?? (arr[i] as { results: { c: number }[] }).results?.[0]?.c ?? 0);
    return {
      persons: num(q.map((r) => r.results), 0),
      generations: num(q, 1),
      media: num(q, 2),
      spouses: num(q, 3),
    };
  }

  /** یافتن بهترین گره ریشه: فردی که هیچ والد شناخته‌شده‌ای ندارد و قدیمی‌تر است. */
  async findRootPerson(familyId: string): Promise<string | null> {
    const { results } = await this.env.DB.prepare(
      `SELECT id FROM persons p WHERE p.family_id = ?
       AND NOT EXISTS (
         SELECT 1 FROM relationships r
         WHERE r.family_id = p.family_id AND r.relationship_type='PARENT' AND r.person_b_id = p.id
       )
       ORDER BY COALESCE(p.birth_year_min, 9999) ASC, p.created_at ASC LIMIT 1`
    ).bind(familyId).all<{ id: string }>();
    return results[0]?.id ?? null;
  }
}