import type { Ai, KVNamespace, R2Bucket, D1Database } from "@cloudflare/workers-types";

export interface Env {
  DB: D1Database;
  SESSIONS: KVNamespace;
  MEDIA: R2Bucket;
  AI: Ai;
  ENVIRONMENT: string;
  AI_PROVIDER: string;
  AI_MODEL: string;
  APP_URL?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  role: "ADMIN" | "USER";
  created_at: string;
  updated_at: string;
}

/** جایگاه یک کاربر داخل یک خانواده + نقش عضویت */
export type FamilyRole = "ADMIN" | "EDITOR" | "VIEWER";
export type MembershipStatus = "ACTIVE" | "PENDING" | "SUSPENDED";

export type Gender = "MALE" | "FEMALE" | "UNKNOWN";
export type PrivacyLevel = "PUBLIC" | "FAMILY" | "PRIVATE";
export type RelationshipType = "PARENT" | "CHILD" | "SPOUSE" | "PARTNER" | "SIBLING";

export type ApiErrorBody = { error: { message: string; code?: string } };