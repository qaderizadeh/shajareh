import type { Env, User } from "../env";
import { uuid, mediaKey } from "../util/id";
import { badRequest, notFound } from "../util/errors";
import { AuditService } from "./audit";

const MAX_PHOTO = 8 * 1024 * 1024; // ۸ مگابایت
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"]);

function extFromMime(mime: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "application/pdf": "pdf",
  };
  return map[mime] ?? "bin";
}

export class MediaService {
  private env: Env;
  private audit: AuditService;
  constructor(env: Env) {
    this.env = env;
    this.audit = new AuditService(env);
  }

  private requireBucket() {
    if (!this.env.MEDIA) {
      throw badRequest("ذخیرهٔ فایل هنوز فعال نشده است؛ لطفاً R2 را در حساب Cloudflare فعال کنید.", "R2_DISABLED");
    }
    return this.env.MEDIA;
  }

  async upload(user: User, familyId: string, file: Blob, opts: { person_id?: string; caption?: string; kind?: "PHOTO" | "DOCUMENT" }) {
    if (!ALLOWED.has(file.type)) throw badRequest("نوع فایل مجاز نیست (تصویر یا PDF)", "BAD_FILE_TYPE");
    if (file.size > MAX_PHOTO) throw badRequest("حجم فایل نباید بیشتر از ۸ مگابایت باشد", "FILE_TOO_LARGE");
    const bucket = this.requireBucket();

    const kind = opts.kind ?? (file.type === "application/pdf" ? "DOCUMENT" : "PHOTO");
    const ext = extFromMime(file.type);
    const uid = uuid();
    const key = mediaKey(familyId, kind, ext);
    await bucket.put(key, file.stream(), {
      httpMetadata: { contentType: file.type },
      customMetadata: { familyId, sideOf: opts.person_id ?? "" },
    });

    await this.env.DB.prepare(
      `INSERT INTO media (id, family_id, person_id, kind, storage_key, mime_type, size, caption)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(uid, familyId, opts.person_id ?? null, kind, key, file.type, file.size, opts.caption?.trim() ?? "")
      .run();

    await this.audit.log({ userId: user.id, entityType: "media", entityId: uid, action: "UPLOAD", after: { key } });
    return this.get(familyId, uid);
  }

  async get(familyId: string, id: string) {
    const row = await this.env.DB.prepare("SELECT * FROM media WHERE id = ? AND family_id = ?").bind(id, familyId).first();
    if (!row) throw notFound("فایل پیدا نشد", "MEDIA_NOT_FOUND");
    return row;
  }

  async list(familyId: string, personId?: string) {
    if (personId) {
      const { results } = await this.env.DB.prepare(
        "SELECT * FROM media WHERE family_id = ? AND person_id = ? ORDER BY created_at DESC"
      ).bind(familyId, personId).all<Record<string, unknown>>();
      return results;
    }
    const { results } = await this.env.DB.prepare(
      "SELECT * FROM media WHERE family_id = ? ORDER BY created_at DESC"
    ).bind(familyId).all<Record<string, unknown>>();
    return results;
  }

  async serve(familyId: string, id: string): Promise<{ body: ReadableStream; type: string; length: number } | null> {
    const bucket = this.requireBucket();
    const row = await this.get(familyId, id);
    const object = await bucket.get(row.storage_key as string);
    if (!object) return null;
    return { body: object.body, type: (row.mime_type as string) || "application/octet-stream", length: Number(object.size) };
  }

  async remove(user: User, familyId: string, id: string) {
    const bucket = this.requireBucket();
    const row = await this.get(familyId, id);
    await bucket.delete(row.storage_key as string);
    await this.env.DB.prepare("DELETE FROM media WHERE id = ? AND family_id = ?").bind(id, familyId).run();
    await this.audit.log({ userId: user.id, entityType: "media", entityId: id, action: "DELETE", before: row });
  }
}