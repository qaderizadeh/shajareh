import type { Env, User } from "../env";
import { forbidden, notFound } from "../util/errors";

export class AdminService {
  constructor(private env: Env) {}

  private requireAdmin(user: User) {
    if (user.role !== "ADMIN") throw forbidden("دسترسی ادمین لازم است", "ADMIN_ONLY");
  }

  async stats(user: User) {
    this.requireAdmin(user);
    const q = await this.env.DB.batch([
      this.env.DB.prepare("SELECT COUNT(*) c FROM users"),
      this.env.DB.prepare("SELECT COUNT(*) c FROM families"),
      this.env.DB.prepare("SELECT COUNT(*) c FROM persons"),
      this.env.DB.prepare("SELECT COUNT(*) c FROM relationships"),
      this.env.DB.prepare("SELECT COUNT(*) c FROM media"),
      this.env.DB.prepare("SELECT COUNT(*) c FROM ai_proposals"),
    ]);
    const n = (i: number) => Number((q[i]!.results as { c: number }[])[0]?.c ?? 0);
    return {
      users: n(0),
      families: n(1),
      persons: n(2),
      relationships: n(3),
      media: n(4),
      aiProposals: n(5),
    };
  }

  async listUsers(user: User, limit = 50) {
    this.requireAdmin(user);
    const { results } = await this.env.DB.prepare(
      "SELECT id, name, email, role, avatar, created_at FROM users ORDER BY created_at DESC LIMIT ?"
    ).bind(limit).all<Record<string, unknown>>();
    return results;
  }

  async setRole(user: User, targetId: string, role: "ADMIN" | "USER") {
    this.requireAdmin(user);
    if (targetId === user.id) throw forbidden("نمی‌توانید نقش خودتان را عوض کنید", "SELF_ROLE");
    await this.env.DB.prepare("UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(role, targetId).run();
    return { ok: true };
  }

  async familyAffected(user: User, familyId: string) {
    this.requireAdmin(user);
    const row = await this.env.DB.prepare("SELECT id, name FROM families WHERE id = ?").bind(familyId).first();
    if (!row) throw notFound("خانواده پیدا نشد", "FAMILY_NOT_FOUND");
    await this.env.DB.prepare("UPDATE family_memberships SET status='SUSPENDED' WHERE family_id = ?").bind(familyId).run();
    return { ok: true, family: row };
  }

  async removeUser(user: User, targetId: string) {
    this.requireAdmin(user);
    if (targetId === user.id) throw forbidden("نمی‌توانید خودتان را حذف کنید", "SELF_REMOVE");
    await this.env.DB.prepare("DELETE FROM users WHERE id = ?").bind(targetId).run();
    return { ok: true };
  }

  async listFamilies(user: User, limit = 50) {
    this.requireAdmin(user);
    const { results } = await this.env.DB.prepare(
      `SELECT f.id, f.name, f.description, f.created_at,
              (SELECT COUNT(*) FROM persons p WHERE p.family_id = f.id) AS persons_count,
              (SELECT COUNT(*) FROM family_memberships m WHERE m.family_id = f.id AND m.status='ACTIVE') AS members_count
       FROM families f ORDER BY f.created_at DESC LIMIT ?`
    ).bind(limit).all<Record<string, unknown>>();
    return results;
  }

  async listAuditLogs(user: User, limit = 50) {
    this.requireAdmin(user);
    const { results } = await this.env.DB.prepare(
      `SELECT a.*, u.name AS user_name FROM audit_logs a
       LEFT JOIN users u ON u.id = a.user_id
       ORDER BY a.created_at DESC LIMIT ?`
    ).bind(limit).all<Record<string, unknown>>();
    return results;
  }
}