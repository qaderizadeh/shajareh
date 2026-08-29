import type { Gender } from "./types";

export function faDigits(input: string | number | null | undefined): string {
  if (input === null || input === undefined) return "";
  return String(input).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)] ?? d);
}

/** نام‌نمایش با قابلیت ناشناس بودن */
export function personName(first?: string, last?: string): string {
  return [first?.trim(), last?.trim()].filter(Boolean).join(" ") || "نامشخص";
}

export function genderLabel(g: Gender | string | undefined): string {
  if (g === "FEMALE") return "زن";
  if (g === "MALE") return "مرد";
  return "نامشخص";
}

export function lifeSpan(p: { birth_date_text?: string; death_date_text?: string; is_living?: number }): string {
  const b = p.birth_date_text?.trim();
  const d = p.death_date_text?.trim();
  const alive = p.is_living === 1 || (!d && !p.death_date_text);
  if (b && d) return `${faDigits(b)} — ${faDigits(d)}`;
  if (b && alive) return `${faDigits(b)} — اکنون`;
  if (d) return `وفات ${faDigits(d)}`;
  return "—";
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "؟";
  return (parts[0][0] ?? "") + (parts.length > 1 ? (parts[1][0] ?? "") : "");
}

/** تبدیل نام به برچسب‌های جست‌وجوی عادی (فقط نمایش) */
export function relativeLabel(type: string): string {
  const map: Record<string, string> = {
    PARENT: "والد",
    CHILD: "فرزند",
    SPOUSE: "همسر",
    PARTNER: "شریک",
    SIBLING: "خواهر/برادر",
  };
  return map[type] ?? type;
}