import type { Env, Gender, User } from "../env";
import { uuid } from "../util/id";
import { normalizePersian } from "../util/persian";
import { parsePersianDateSpan } from "../util/dates";
import { badRequest, notFound } from "../util/errors";
import { AuditService } from "./audit";

export interface PersonInput {
  first_name: string;
  last_name?: string;
  father_name?: string;
  mother_name?: string;
  gender?: Gender;
  birth_date_text?: string;
  birth_place?: string;
  death_date_text?: string;
  death_place?: string;
  is_living?: boolean;
  occupation?: string;
  residence?: string;
  education?: string;
  biography?: string;
  is_private?: boolean;
}

export interface DuplicateCandidate {
  id: string;
  first_name: string;
  last_name: string;
  birth_date_text: string;
  birth_place: string;
  score: number;
}

export class PersonService {
  private env: Env;
  private audit: AuditService;
  constructor(env: Env) {
    this.env = env;
    this.audit = new AuditService(env);
  }

  private buildValues(input: PersonInput) {
    const birth = parsePersianDateSpan(input.birth_date_text ?? "");
    const death = parsePersianDateSpan(input.death_date_text ?? "");
    const isLiving = input.is_living ?? !(input.death_date_text || input.death_place || death.minYear !== null);
    return {
      first_name: input.first_name?.trim(),
      last_name: input.last_name?.trim() ?? "",
      father_name: input.father_name?.trim() ?? "",
      mother_name: input.mother_name?.trim() ?? "",
      gender: input.gender ?? "UNKNOWN",
      birth_date_text: input.birth_date_text?.trim() ?? "",
      birth_year_min: birth.minYear,
      birth_year_max: birth.maxYear,
      birth_place: input.birth_place?.trim() ?? "",
      death_date_text: input.death_date_text?.trim() ?? "",
      death_year_min: death.minYear,
      death_year_max: death.maxYear,
      death_place: input.death_place?.trim() ?? "",
      is_living: isLiving ? 1 : 0,
      occupation: input.occupation?.trim() ?? "",
      residence: input.residence?.trim() ?? "",
      education: input.education?.trim() ?? "",
      biography: input.biography?.trim() ?? "",
      is_private: input.is_private ? 1 : 0,
    };
  }

  async create(user: User, familyId: string, input: PersonInput) {
    if (!input.first_name?.trim()) throw badRequest("نام را وارد کنید", "INVALID_NAME");
    const v = this.buildValues(input);
    const id = uuid();
    await this.env.DB.prepare(
      `INSERT INTO persons (
        id, family_id, first_name, last_name, father_name, mother_name, gender,
        birth_date_text, birth_year_min, birth_year_max, birth_place,
        death_date_text, death_year_min, death_year_max, death_place, is_living,
        occupation, residence, education, biography, is_private, created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    )
      .bind(
        id, familyId, v.first_name, v.last_name, v.father_name, v.mother_name, v.gender,
        v.birth_date_text, v.birth_year_min, v.birth_year_max, v.birth_place,
        v.death_date_text, v.death_year_min, v.death_year_max, v.death_place, v.is_living,
        v.occupation, v.residence, v.education, v.biography, v.is_private, user.id
      )
      .run();
    await this.audit.log({ userId: user.id, entityType: "person", entityId: id, action: "CREATE", after: { first_name: v.first_name, last_name: v.last_name } });
    return this.get(id);
  }

  async get(personId: string) {
    const row = await this.env.DB.prepare("SELECT * FROM persons WHERE id = ?").bind(personId).first();
    if (!row) throw notFound("شخص پیدا نشد", "PERSON_NOT_FOUND");
    return row;
  }

  async update(user: User, personId: string, input: PersonInput) {
    const existing = await this.get(personId);
    // Merge: use input if provided, otherwise keep existing value
    const merged: PersonInput = {
      first_name: input.first_name ?? (existing.first_name as string),
      last_name: input.last_name ?? (existing.last_name as string),
      father_name: input.father_name ?? (existing.father_name as string),
      mother_name: input.mother_name ?? (existing.mother_name as string),
      gender: (input.gender ?? existing.gender as string) as Gender,
      birth_date_text: input.birth_date_text ?? (existing.birth_date_text as string),
      birth_place: input.birth_place ?? (existing.birth_place as string),
      death_date_text: input.death_date_text ?? (existing.death_date_text as string),
      death_place: input.death_place ?? (existing.death_place as string),
      is_living: input.is_living ?? Boolean(existing.is_living),
      occupation: input.occupation ?? (existing.occupation as string),
      residence: input.residence ?? (existing.residence as string),
      education: input.education ?? (existing.education as string),
      biography: input.biography ?? (existing.biography as string),
      is_private: input.is_private ?? Boolean(existing.is_private),
    };
    const v = this.buildValues(merged);
    await this.env.DB.prepare(
      `UPDATE persons SET
        first_name=?, last_name=?, father_name=?, mother_name=?, gender=?,
        birth_date_text=?, birth_year_min=?, birth_year_max=?, birth_place=?,
        death_date_text=?, death_year_min=?, death_year_max=?, death_place=?, is_living=?,
        occupation=?, residence=?, education=?, biography=?, is_private=?,
        updated_at = datetime('now')
       WHERE id=?`
    )
      .bind(
        v.first_name, v.last_name, v.father_name, v.mother_name, v.gender,
        v.birth_date_text, v.birth_year_min, v.birth_year_max, v.birth_place,
        v.death_date_text, v.death_year_min, v.death_year_max, v.death_place, v.is_living,
        v.occupation, v.residence, v.education, v.biography, v.is_private,
        personId
      )
      .run();
    await this.audit.log({ userId: user.id, entityType: "person", entityId: personId, action: "UPDATE", before: existing, after: v });
    return this.get(personId);
  }

  async remove(user: User, familyId: string, personId: string) {
    const existing = await this.get(personId);
    await this.env.DB.batch([
      this.env.DB.prepare("DELETE FROM relationships WHERE family_id = ? AND (person_a_id = ? OR person_b_id = ?)").bind(familyId, personId, personId),
      this.env.DB.prepare("DELETE FROM media WHERE person_id = ? AND family_id = ?").bind(personId, familyId),
      this.env.DB.prepare("DELETE FROM persons WHERE id = ? AND family_id = ?").bind(personId, familyId),
    ]);
    await this.audit.log({ userId: user.id, entityType: "person", entityId: personId, action: "DELETE", before: existing });
  }

  /** تشخیص افراد مشابه (deterministic) برای پیشگیری از تکرار */
  async findDuplicates(familyId: string, input: PersonInput, limit = 5): Promise<DuplicateCandidate[]> {
    const { results } = await this.env.DB.prepare(
      `SELECT id, first_name, last_name, birth_date_text, birth_place FROM persons
       WHERE family_id = ? ORDER BY created_at DESC LIMIT 1000`
    ).bind(familyId).all<Record<string, unknown>>();

    const first = normalizePersian(input.first_name ?? "");
    const last = normalizePersian(input.last_name ?? "");
    const birth = parsePersianDateSpan(input.birth_date_text ?? "");

    const scored: DuplicateCandidate[] = [];
    for (const r of results) {
      let score = 0;
      if (first && normalizePersian(r.first_name as string) === first) score += 50;
      if (last && normalizePersian(r.last_name as string) === last) score += 30;
      const rb = parsePersianDateSpan((r.birth_date_text as string) ?? "");
      if (birth.minYear !== null && rb.minYear !== null && Math.abs(birth.minYear - rb.minYear) <= 2) score += 20;
      if (input.gender && r.gender === input.gender) score += 2;
      if (score >= 70) {
        scored.push({
          id: r.id as string,
          first_name: r.first_name as string,
          last_name: r.last_name as string,
          birth_date_text: (r.birth_date_text as string) ?? "",
          birth_place: (r.birth_place as string) ?? "",
          score,
        });
      }
    }
    return scored.sort((a, b) => b.score - a.score).slice(0, limit);
  }
}