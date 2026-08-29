import { Hono } from "hono";
import type { MediaService } from "../services/media";
import { PrivacyService } from "../services/privacy";
import { authRequired, type AppEnv } from "../middleware/auth";
import { notFound } from "../util/errors";

export function mediaRoutes(mediaSvc: MediaService, privacySvc: PrivacyService) {
  const app = new Hono<AppEnv>();
  app.use("*", authRequired);

  app.post("/", async (c) => {
    const user = c.get("user");
    const body = await c.req.formData();
    const familyId = String(body.get("family_id") ?? "");
    await privacySvc.requireWrite(user, familyId);
    const entry = body.get("file");
    if (!entry || typeof entry === "string") {
      return c.json({ error: { message: "فایل انتخاب نشده است", code: "FILE_REQUIRED" } }, 400);
    }
    const file: Blob = entry;
    const media = await mediaSvc.upload(user, familyId, file, {
      person_id: String(body.get("person_id") ?? "") || undefined,
      caption: String(body.get("caption") ?? "") || undefined,
    });
    return c.json({ media }, 201);
  });

  app.get("/:id", async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const row = await c.env.DB.prepare("SELECT family_id FROM media WHERE id = ?").bind(id).first<{ family_id: string }>();
    if (!row) throw notFound("فایل پیدا نشد", "MEDIA_NOT_FOUND");
    await privacySvc.requireRead(user, row.family_id);
    const served = await mediaSvc.serve(row.family_id, id);
    if (!served) throw notFound("فایل پیدا نشد", "MEDIA_NOT_FOUND");
    return new Response(served.body, {
      headers: { "Content-Type": served.type, "Cache-Control": "public, max-age=86400" },
    });
  });

  app.get("/list/:familyId", async (c) => {
    const user = c.get("user");
    const familyId = c.req.param("familyId");
    await privacySvc.requireRead(user, familyId);
    const personId = c.req.query("personId") || undefined;
    return c.json({ media: await mediaSvc.list(familyId, personId) });
  });

  app.delete("/:id", async (c) => {
    const user = c.get("user");
    const id = c.req.param("id");
    const row = await c.env.DB.prepare("SELECT family_id FROM media WHERE id = ?").bind(id).first<{ family_id: string }>();
    if (row) {
      await privacySvc.requireWrite(user, row.family_id);
      await mediaSvc.remove(user, row.family_id, id);
    }
    return c.json({ ok: true });
  });

  return app;
}