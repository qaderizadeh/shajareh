import { Hono } from "hono";
import type { FamilyService } from "../services/family";
import { PrivacyService } from "../services/privacy";
import { RelationshipService } from "../services/relationship";
import { authRequired, type AppEnv } from "../middleware/auth";
import { notFound } from "../util/errors";

export function familyRoutes(familySvc: FamilyService, privacySvc: PrivacyService, relSvc: RelationshipService) {
  const app = new Hono<AppEnv>();
  app.use("*", authRequired);

  app.post("/", async (c) => {
    const user = c.get("user");
    const body = await c.req.json<{ name?: string; description?: string }>().catch(() => ({} as never));
    const family = await familySvc.create(user, body.name ?? "", body.description);
    return c.json({ family }, 201);
  });

  app.get("/", async (c) => {
    const user = c.get("user");
    return c.json({ families: await familySvc.listForUser(user) });
  });

  app.get("/:id", async (c) => {
    const user = c.get("user");
    const familyId = c.req.param("id");
    await privacySvc.requireRead(user, familyId);
    const [family, stats, rootId] = await Promise.all([
      familySvc.get(familyId),
      familySvc.stats(familyId),
      familySvc.findRootPerson(familyId),
    ]);
    return c.json({ family, stats, rootId });
  });

  app.get("/:id/graph", async (c) => {
    const user = c.get("user");
    const familyId = c.req.param("id");
    await privacySvc.requireRead(user, familyId);
    const graph = await relSvc.graph(familyId);
    return c.json(graph);
  });

  return app;
}