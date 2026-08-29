import { Hono } from "hono";
import type { AiService } from "../services/ai";
import { PrivacyService } from "../services/privacy";
import { authRequired, type AppEnv } from "../middleware/auth";

export function aiRoutes(aiSvc: AiService, privacySvc: PrivacyService) {
  const app = new Hono<AppEnv>();
  app.use("*", authRequired);

  app.post("/propose", async (c) => {
    const user = c.get("user");
    const body = await c.req.json<{ family_id?: string; text?: string }>().catch(() => ({} as never));
    const familyId = String(body.family_id ?? "");
    await privacySvc.requireWrite(user, familyId);
    const result = await aiSvc.generateProposal(user, familyId, body.text ?? "");
    return c.json(result, 201);
  });

  app.post("/proposals/:id/apply", async (c) => {
    const user = c.get("user");
    const proposalId = c.req.param("id");
    const row = await c.env.DB.prepare("SELECT family_id FROM ai_proposals WHERE id = ?").bind(proposalId).first<{ family_id: string }>();
    if (!row) return c.json({ error: { message: "پیشنهاد پیدا نشد", code: "NOT_FOUND" } }, 404);
    await privacySvc.requireWrite(user, row.family_id);
    const applied = await aiSvc.applyProposal(user, row.family_id, proposalId);
    return c.json(applied);
  });

  app.post("/explain", async (c) => {
    const user = c.get("user");
    const body = await c.req.json<{ family_id?: string; fromId?: string; toId?: string; chain?: string }>().catch(() => ({} as never));
    const familyId = String(body.family_id ?? "");
    await privacySvc.requireRead(user, familyId);
    const text = await aiSvc.explainRelation(familyId, body.fromId ?? "", body.toId ?? "", body.chain ?? "");
    return c.json({ explain: text });
  });

  app.get("/suggestions/:familyId", async (c) => {
    const user = c.get("user");
    const familyId = c.req.param("familyId");
    await privacySvc.requireWrite(user, familyId);
    return c.json({ suggestions: await aiSvc.duplicateSuggestion(familyId) });
  });

  return app;
}