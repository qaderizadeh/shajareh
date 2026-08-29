import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizePersian, toPersianDigits, toLatinDigits, equalsNormalized } from "./persian";

describe("normalizePersian", () => {
  it("یکسان‌سازی ي/ی و ك/ک", () => {
    assert.equal(normalizePersian("علي")[2], "ی"); // آخرین حرف = ی
    assert.equal(normalizePersian("کتاب"), normalizePersian("كتاب"));
  });
  it("برخورد با نیم‌فاصله‌ها", () => {
    assert.equal(normalizePersian("محمد\u200cعلی"), normalizePersian("محمد علی"));
    assert.ok(normalizePersian("خانه\u200cدار").replace(/\s/g, "").includes("خانه"));
  });
  it("حذف اعراب", () => {
    assert.equal(normalizePersian("قادری"), normalizePersian("قادِری"));
  });
  it("برابری", () => {
    assert.equal(equalsNormalized("علی", "علي"), true);
  });
});

describe("digits", () => {
  it("فارسی به انگلیسی", () => {
    assert.equal(toLatinDigits("۱۳۰۵"), "1305");
  });
  it("انگلیسی به فارسی", () => {
    assert.equal(toPersianDigits(1305), "۱۳۰۵");
  });
});