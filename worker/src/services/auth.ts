import type { Env, User } from "../env";
import { uuid, sessionToken } from "../util/id";
import { hashPassword, verifyPassword } from "../util/crypto";
import { normalizePersian } from "../util/persian";
import { badRequest, unauthorized } from "../util/errors";
import type { Context } from "hono";

const SESSION_PREFIX = "session:";
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60; // ۳۰ روز

function rowToUser(row: Record<string, unknown>): User {
  return {
    id: row.id as string,
    name: row.name as string,
    email: row.email as string,
    avatar: (row.avatar as string) || null,
    role: row.role as User["role"],
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export class AuthService {
  constructor(private env: Env) {}

  private async findUserByEmail(email: string) {
    const { results } = await this.env.DB.prepare(
      "SELECT * FROM users WHERE email = ? LIMIT 1"
    ).bind(email.toLocaleLowerCase().trim()).all<Record<string, unknown>>();
    return results[0];
  }

  async register(name: string, email: string, password: string): Promise<{ user: User }> {
    if (!name?.trim()) throw badRequest("نام را وارد کنید", "INVALID_NAME");
    const normalizedEmail = email.toLocaleLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail))
      throw badRequest("ایمیل معتبر وارد کنید", "INVALID_EMAIL");
    if (password.length < 8)
      throw badRequest("گذرواژه باید حداقل ۸ کاراکتر باشد", "WEAK_PASSWORD");

    const existing = await this.findUserByEmail(normalizedEmail);
    if (existing) throw badRequest("این ایمیل قبلاً ثبت شده است", "EMAIL_EXISTS");

    const id = uuid();
    const passwordHash = await hashPassword(password);
    await this.env.DB.prepare(
      "INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)"
    ).bind(id, name.trim(), normalizedEmail, passwordHash).run();

    const user = await this.getById(id);
    return { user };
  }

  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const row = await this.findUserByEmail(email);
    if (!row) throw unauthorized("ایمیل یا گذرواژه اشتباه است", "INVALID_CREDENTIALS");
    const ok = await verifyPassword(password, row.password_hash as string);
    if (!ok) throw unauthorized("ایمیل یا گذرواژه اشتباه است", "INVALID_CREDENTIALS");

    const token = sessionToken();
    await this.env.SESSIONS.put(SESSION_PREFIX + token, String(row.id), {
      expirationTtl: SESSION_TTL_SECONDS,
    });
    return { user: rowToUser(row), token };
  }

  async logout(token: string): Promise<void> {
    if (token) await this.env.SESSIONS.delete(SESSION_PREFIX + token);
  }

  async getById(id: string): Promise<User> {
    const row = await this.env.DB.prepare(
      "SELECT id, name, email, avatar, role, created_at, updated_at FROM users WHERE id = ? LIMIT 1"
    ).bind(id).first<Record<string, unknown>>();
    if (!row) throw unauthorized("نشست معتبر نیست", "SESSION_INVALID");
    return rowToUser(row);
  }

  async getByToken(token: string): Promise<User | null> {
    if (!token) return null;
    const id = await this.env.SESSIONS.get(SESSION_PREFIX + token);
    if (!id) return null;
    try {
      return await this.getById(id);
    } catch {
      return null;
    }
  }
}

/** کاربر درخواست جاری از هدر Authorization */
export function extractBearer(c: Context): string {
  const header = c.req.header("Authorization") ?? "";
  if (header.startsWith("Bearer ")) return header.slice(7).trim();
  return "";
}

export { normalizePersian };