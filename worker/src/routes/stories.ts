import { Hono } from "hono";
import type { StoriesService } from "../services/stories";
import { PrivacyService } from "../services/privacy";
import { authRequired, type AppEnv } from "../middleware/auth";

export function storiesRoutes(storiesSvc: StoriesService, privacySvc: PrivacyService) {
  const app = new Hono<AppEnv>();
  app.use("*", authRequired);

  app.post("/", async (c) => {
    const user = c.get("user");
    const body = await c.req.json<{ family_id?: string; title?: string; body?: string; person_id?: string; date_text?: string; location?: string }>().catch(() => ({} as never));
    const familyId = String(body.family_id ?? "");
    await privacySvc.requireWrite(user, familyId);
    const story = await storiesSvc.create(user, familyId, { title: body.title ?? "", body: body.body, person_id: body.person_id, date_text: body.date_text, location: body.location });
    return c.json({ story }, 201);
  });

  app.get("/list/:familyId", async (c) => {
    const user = c.get("user");
    const familyId = c.req.param("familyId");
    await privacySvc.requireRead(user, familyId);
    const personId = c.req.query("personId") || undefined;
    return c.json({ stories: await storiesSvc.list(familyId, personId) });
  });

  app.get("/:id", async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const body = (await c.req.json().catch(() => ({}))) as { family_id?: string };
    // We need family_id from query or body
    const familyId = c.req.query("familyId") || "";
    await privacySvc.requireRead(user, familyId);
    return c.json({ story: await storiesSvc.get(familyId, id) });
  });

  app.patch("/:id", async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const familyId = c.req.query("familyId") || "";
    await privacySvc.requireWrite(user, familyId);
    const body = await c.req.json().catch(() => ({} as never));
    const story = await storiesSvc.update(user, familyId, id, body);
    return c.json({ story });
  });

  app.delete("/:id", async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const familyId = c.req.query("familyId") || "";
    await privacySvc.requireWrite(user, familyId);
    await storiesSvc.remove(user, familyId, id);
    return c.json({ ok: true });
  });

  return app;
}
