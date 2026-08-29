import { Hono } from "hono";
import type { Env } from "../env";
import { authRequired, type AppEnv } from "../middleware/auth";
import { PrivacyService } from "../services/privacy";

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

  return app;
}
