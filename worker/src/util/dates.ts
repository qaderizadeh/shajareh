import { toLatinDigits } from "./persian";

export interface DateSpan {
  /** متن اصلی کاربر (می‌تواند تقریبی باشد: «حدود ۱۲۵۰» یا «بین ۱۲۴۰ و ۱۲۵۵») */
  text: string;
  minYear: number | null;
  maxYear: number | null;
}

const PERSIAN_MONTHS: Record<string, number> = {
  فروردین: 1,
  اردیبهشت: 2,
  خرداد: 3,
  تیر: 4,
  مرداد: 5,
  شهریور: 6,
  مهر: 7,
  آبان: 8,
  آذر: 9,
  دی: 10,
  بهمن: 11,
  اسفند: 12,
};

function extractYears(m: string): number[] {
  const latin = toLatinDigits(m);
  return (latin.match(/\d{4}/g) ?? [])
    .map(Number)
    .filter((n) => n >= 1000 && n < 1700); // بازهٔ سال شمسی محتمل
}

/**
 * یک رشتهٔ تاریخ (عموماً شمسی) را به یک بازهٔ عددی سال تبدیل می‌کند.
 * دههٔ خورشیدی (مثلاً ۱۳۰۰) را با برچسب عبرت نمی‌کند؛ نیم‌فاصله‌ها پاک می‌شوند.
 * اگر دههٔ شمسی داده شود (مثل ۱۲۵۰) چون اعداد کمتر از ۰ نگاه می‌شوند، با سال میلادی ابهام دارد؛
 * برای MVP، عدد ۱۳xx یا 12xx به‌عنوان سال شمسی (بدون تبدیل) استفاده می‌شود.
 */
export function parsePersianDateSpan(input: string): DateSpan {
  const raw = String(input ?? "").trim();
  if (!raw) return { text: raw, minYear: null, maxYear: null };

  const normalized = toLatinDigits(raw)
    .replace(/\u200c/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const years = extractYears(normalized);

  if (years.length === 0) {
    return { text: raw, minYear: null, maxYear: null };
  }

  // «بین ... و ...» یا «حدود ...» → بازه
  if (/بین/.test(normalized) && years.length >= 2) {
    const sorted = [...years].sort((a, b) => a - b);
    return { text: raw, minYear: sorted[0]!, maxYear: sorted[Math.min(1, sorted.length - 1)]! };
  }

  if (/حدود|حداقل|تقریبا|تقریباً|مقارن|برابر/.test(normalized)) {
    const y = years[0]!;
    return { text: raw, minYear: y - 2, maxYear: y + 2 };
  }

  if (/قبل از|پیش از/.test(normalized)) {
    return { text: raw, minYear: null, maxYear: years[0]! };
  }

  if (/بعد از|پس از|بعداً/.test(normalized)) {
    return { text: raw, minYear: years[0]!, maxYear: null };
  }

  // سال تنها → بازهٔ دقیق
  const y = years[0]!;
  return { text: raw, minYear: y, maxYear: y };
}

/** تخمین سن با توجه به تاریخ شمسی تقریبی (سال) — صرفاً برای نمایش. */
export function estimateAge(birthMin: number | null, birthMax: number | null, deathMin: number | null): number | null {
  if (birthMin === null || birthMax === null) return null;
  const end = deathMin ?? new Date().getFullYear();
  const low = end - birthMax;
  const high = end - birthMin;
  if (high <= 0) return null;
  return Math.round((low + high) / 2);
}