/** نرمال‌سازی متن فارسی برای جست‌وجو: یکسان‌سازی ی/ي، ک/ك، فاصله/نیم‌فاصله، اعراب و ارقام. */
export function normalizePersian(input: string): string {
  return String(input ?? "")
    .trim()
    .replace(/[\u064A\u06CC]/g, "ی") // ي و ى → ی
    .replace(/[\u0643\u06A9]/g, "ک") // ك و ک → ک
  .replace(/[\u0622\u0623\u0624\u0625\u0626\u06C0\u06CC]/g, (ch) => {
    // نرمال‌سازی پایهٔ شکل‌های مرکب حروف
    const base: Record<string, string> = {
      "\u0622": "ا", // آ → ا
      "\u0623": "ا", // أ → ا
      "\u0624": "و", // ؤ → و
      "\u0625": "ا", // إ → ا
      "\u0626": "ی", // ئ → ی
      "\u06C0": "ه", // هٔ → ه
      "\u06CC": "ی",
    };
    return base[ch] ?? "";
  })
  .replace(/[\u064B-\u0652\u0670]/g, "") // فقط حرکات/اعراب ضمیمه‌ای
    .replace(/[\u200C\u200F\u200E\u00AD]/g, " ") // نیم‌فاصله/ZW → فاصله
    .replace(/\s+/g, " ")
    .normalize("NFKC")
    .trim()
    .toLowerCase();
}

/** تبدیل ارقام فارسی/عربی به انگلیسی */
export function toLatinDigits(input: string): string {
  return String(input ?? "").replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
}

/** تبدیل ارقام انگلیسی به فارسی */
export function toPersianDigits(input: string | number): string {
  return String(input).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)] ?? d);
}

/** آیا رشتهٔ داده‌شده با نرمال‌سازی دو طرف برابر است؟ */
export function equalsNormalized(a: string, b: string): boolean {
  return normalizePersian(a) === normalizePersian(b);
}