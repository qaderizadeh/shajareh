import type { Env } from "../env";
import { normalizePersian } from "../util/persian";

export interface SearchFilters {
  q: string;
  familyId?: string;
  limit?: number;
  offset?: number;
}

export class SearchService {
  constructor(private env: Env) {}

  async persons(filters: SearchFilters) {
    const q = normalizePersian(filters.q || "");
    const limit = Math.min(filters.limit ?? 20, 100);
    const offset = filters.offset ?? 0;

    if (!q) {
      const { results } = await this.env.DB.prepare(
        `SELECT p.id, p.family_id, p.first_name, p.last_name, p.gender, p.birth_date_text, p.death_date_text,
                p.birth_place, p.is_living, f.name AS family_name
         FROM persons p JOIN families f ON f.id = p.family_id
         ${filters.familyId ? "WHERE p.family_id = ?" : ""}
         ORDER BY p.last_name, p.first_name LIMIT ? OFFSET ?`
      )
        .bind(...(filters.familyId ? [filters.familyId] : []), limit, offset)
        .all<Record<string, unknown>>();
      return results;
    }

    // جست‌وجو روی ستون‌های نرمال‌نشده با تطبیق نرمال‌سازی‌شده در سطح اسکیما:
    // برای کارایی، از LIKE روی ستون‌های اصلی استفاده و بعداً در لایهٔ UI نرمال می‌کنیم.
    const like = `%${q}%`;
    const { results } = await this.env.DB.prepare(
      `SELECT p.id, p.family_id, p.first_name, p.last_name, p.gender, p.birth_date_text, p.death_date_text,
              p.birth_place, p.is_living, f.name AS family_name
       FROM persons p JOIN families f ON f.id = p.family_id
       WHERE ${filters.familyId ? "p.family_id = ? AND " : ""}
             (p.first_name LIKE ? OR p.last_name LIKE ? OR p.birth_place LIKE ?
             OR p.occupation LIKE ? OR p.biography LIKE ?)
       ORDER BY p.last_name, p.first_name LIMIT ? OFFSET ?`
    )
      .bind(
        ...(filters.familyId ? [filters.familyId] : []),
        like, like, like, like, like, limit, offset
      )
      .all<Record<string, unknown>>();
    return results.map((r) => ({ ...r, family_name: r.family_name as string }));
  }
}