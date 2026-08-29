import { Hono } from "hono";
import type { RelationshipService } from "../services/relationship";
import { PrivacyService } from "../services/privacy";
import { authRequired, type AppEnv } from "../middleware/auth";

export function relationshipRoutes(relSvc: RelationshipService, privacySvc: PrivacyService) {
  const app = new Hono<AppEnv>();
  app.use("*", authRequired);

  app.post("/", async (c) => {
    const user = c.get("user");
    const body = await c.req.json().catch(() => ({} as never));
    const familyId = String((body as { family_id?: string }).family_id ?? "");
    await privacySvc.requireWrite(user, familyId);
    const graph = await relSvc.add(user, familyId, body as never);
    return c.json({ graph }, 201);
  });

  app.delete("/:id", async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const row = await c.env.DB.prepare("SELECT family_id FROM relationships WHERE id = ?").bind(id).first<{ family_id: string }>();
    if (!row) return c.json({ ok: true });
    await privacySvc.requireWrite(user, row.family_id);
    await relSvc.remove(user, row.family_id, id);
    return c.json({ ok: true });
  });

  app.get("/path", async (c) => {
    const user = c.get("user");
    const fromId = c.req.query("fromId") ?? "";
    const toId = c.req.query("toId") ?? "";
    const who = await c.env.DB.prepare("SELECT family_id FROM persons WHERE id = ?").bind(fromId).first<{ family_id: string }>();
    if (!who) return c.json({ path: [], explain: "" });
    await privacySvc.requireRead(user, who.family_id);
    return c.json(await relSvc.relationshipPath(who.family_id, fromId, toId));
  });

  return app;
}