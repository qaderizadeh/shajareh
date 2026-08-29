import { Hono } from "hono";
import type { PersonService } from "../services/person";
import { PrivacyService } from "../services/privacy";
import { RelationshipService } from "../services/relationship";
import type { Env } from "../env";
import { authRequired, type AppEnv } from "../middleware/auth";

export function personRoutes(personSvc: PersonService, privacySvc: PrivacyService) {
  const app = new Hono<AppEnv>();
  const relSvcFactory = (c: { env: Env }) => new RelationshipService(c.env);
  app.use("*", authRequired);

  app.post("/check-duplicates", async (c) => {
    const user = c.get("user");
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const familyId = String(body.family_id ?? "");
    await privacySvc.requireRead(user, familyId);
    const dupes = await personSvc.findDuplicates(familyId, body as never);
    return c.json({ duplicates: dupes });
  });

  app.post("/", async (c) => {
    const user = c.get("user");
    const body = await c.req.json().catch(() => ({} as never));
    const familyId = String((body as { family_id?: string }).family_id ?? "");
    await privacySvc.requireWrite(user, familyId);
    const person = await personSvc.create(user, familyId, body);
    return c.json({ person }, 201);
  });

  app.get("/:id", async (c) => {
    const user = c.get("user");
    const personId = c.req.param("id");
    const person = await personSvc.get(personId);
    await privacySvc.requireRead(user, person.family_id as string);
    const dupes = await personSvc.findDuplicates(person.family_id as string, {
      first_name: person.first_name as string,
      last_name: person.last_name as string,
    }, 3);
    return c.json({ person, duplicates: dupes });
  });

  app.patch("/:id", async (c) => {
    const user = c.get("user");
    const personId = c.req.param("id");
    const existing = await personSvc.get(personId);
    await privacySvc.requireWrite(user, existing.family_id as string);
    const body = await c.req.json().catch(() => ({} as never));
    const person = await personSvc.update(user, personId, body);
    return c.json({ person });
  });

  app.delete("/:id", async (c) => {
    const user = c.get("user");
    const personId = c.req.param("id");
    const existing = await personSvc.get(personId);
    await privacySvc.requireWrite(user, existing.family_id as string);
    await personSvc.remove(user, existing.family_id as string, personId);
    return c.json({ ok: true });
  });

  app.get("/:id/descendants", async (c) => {
    const user = c.get("user");
    const personId = c.req.param("id");
    const p = await personSvc.get(personId);
    await privacySvc.requireRead(user, p.family_id as string);
    const depth = Number(c.req.query("depth") ?? 8);
    return c.json(await relSvcFactory(c).descendants(p.family_id as string, personId, depth));
  });

  app.get("/:id/ancestors", async (c) => {
    const user = c.get("user");
    const personId = c.req.param("id");
    const p = await personSvc.get(personId);
    await privacySvc.requireRead(user, p.family_id as string);
    const depth = Number(c.req.query("depth") ?? 8);
    return c.json(await relSvcFactory(c).ancestors(p.family_id as string, personId, depth));
  });

  app.get("/:id/family", async (c) => {
    const user = c.get("user");
    const personId = c.req.param("id");
    const p = await personSvc.get(personId);
    await privacySvc.requireRead(user, p.family_id as string);
    return c.json(await relSvcFactory(c).familyView(p.family_id as string, personId));
  });

  return app;
}