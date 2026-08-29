import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parsePersianDateSpan, estimateAge } from "./dates";

describe("parsePersianDateSpan", () => {
  it("سال دقیق", () => {
    assert.equal(parsePersianDateSpan("۱۳۰۵").minYear, 1305);
    assert.equal(parsePersianDateSpan("1305").maxYear, 1305);
  });
  it("حدود", () => {
    const span = parsePersianDateSpan("حدود سال ۱۳۰۰");
    assert.equal(span.minYear, 1298);
    assert.equal(span.maxYear, 1302);
  });
  it("بازهٔ بین", () => {
    const span = parsePersianDateSpan("بین ۱۲۴۰ و ۱۲۵۵");
    assert.equal(span.minYear, 1240);
    assert.equal(span.maxYear, 1255);
  });
  it("قبل از (بدون سال)", () => {
    assert.equal(parsePersianDateSpan("قبل از ازدواج").minYear, null);
  });
  it("رشتهٔ بدون سال", () => {
    assert.equal(parsePersianDateSpan("").minYear, null);
    assert.equal(parsePersianDateSpan("نامشخص").maxYear, null);
  });
});

describe("estimateAge", () => {
  it("سن تقریبی", () => {
    assert.equal(estimateAge(1290, 1292, 1370), 79);
  });
  it("زنده", () => {
    assert.equal(estimateAge(null, null, null), null);
  });
});