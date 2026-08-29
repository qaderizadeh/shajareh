import { Hono } from "hono";
import type { Env } from "../env";
import { authRequired, type AppEnv } from "../middleware/auth";
import { PrivacyService } from "../services/privacy";
import { uuid } from "../util/id";

export function exportRoutes(privacySvc: PrivacyService) {
  const app = new Hono<AppEnv>();
  app.use("*", authRequired);

  app.get("/family/:id", async (c) => {
    const user = c.get("user");
    const familyId = c.req.param("id");
    await privacySvc.requireRead(user, familyId);
    const db = c.env.DB;

    const { results: persons } = await db
      .prepare("SELECT * FROM persons WHERE family_id = ? ORDER BY last_name, first_name")
      .bind(familyId)
      .all<Record<string, unknown>>();

    const { results: relationships } = await db
      .prepare("SELECT * FROM relationships WHERE family_id = ?")
      .bind(familyId)
      .all<Record<string, unknown>>();

    const { results: media } = await db
      .prepare("SELECT id, kind, mime_type, size, caption, person_id, created_at FROM media WHERE family_id = ?")
      .bind(familyId)
      .all<Record<string, unknown>>();

    const family = await db
      .prepare("SELECT * FROM families WHERE id = ?")
      .bind(familyId)
      .first<Record<string, unknown>>();

    return c.json({
      family: { name: family?.name, description: family?.description, exported_at: new Date().toISOString() },
      persons,
      relationships,
      media,
    });
  });

  app.post("/import/:familyId", async (c) => {
    const user = c.get("user");
    const familyId = c.req.param("familyId");
    await privacySvc.requireWrite(user, familyId);
    const body = await c.req.json<{
      persons?: Array<{ first_name?: string; last_name?: string; gender?: string; birth_date_text?: string; birth_place?: string; occupation?: string; biography?: string; is_living?: boolean }>;
      relationships?: Array<{ from_index?: number; to_index?: number; type?: string }>;
    }>().catch(() => ({} as never));
    const db = c.env.DB;
    const createdIds: string[] = [];
    let importedPersons = 0;
    let importedRels = 0;

    // Import persons
    if (body.persons && Array.isArray(body.persons)) {
      for (const p of body.persons) {
        if (!p.first_name?.trim()) continue;
        const id = uuid();
        await db.prepare(
          `INSERT INTO persons (id, family_id, first_name, last_name, gender, birth_date_text, birth_place, occupation, biography, is_living, created_by)
           VALUES (?,?,?,?,?,?,?,?,?,?,?)`
        ).bind(id, familyId, p.first_name.trim(), p.last_name?.trim() ?? "", p.gender ?? "UNKNOWN", p.birth_date_text?.trim() ?? "", p.birth_place?.trim() ?? "", p.occupation?.trim() ?? "", p.biography?.trim() ?? "", p.is_living !== false ? 1 : 0, user.id).run();
        createdIds.push(id);
        importedPersons++;
      }
    }

    // Import relationships
    if (body.relationships && Array.isArray(body.relationships)) {
      for (const r of body.relationships) {
        if (r.from_index == null || r.to_index == null) continue;
        const fromId = createdIds[r.from_index];
        const toId = createdIds[r.to_index];
        if (!fromId || !toId) continue;
        let type = (r.type ?? "PARENT").toUpperCase();
        if (type === "CHILD") type = "PARENT";
        if (!["PARENT", "SPOUSE", "PARTNER", "SIBLING"].includes(type)) continue;
        const id = uuid();
        await db.prepare(
          `INSERT INTO relationships (id, family_id, person_a_id, person_b_id, relationship_type, created_by)
           VALUES (?,?,?,?,?,?)`
        ).bind(id, familyId, fromId, toId, type, user.id).run();
        importedRels++;
      }
    }

    return c.json({ ok: true, importedPersons, importedRels, createdIds });
  });

  return app;
}
