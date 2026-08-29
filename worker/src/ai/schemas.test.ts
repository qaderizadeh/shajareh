import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { GenealogyProposalSchema, businessValidate } from "./schemas";

const valid = {
  persons: [
    { temp_id: "p1", first_name: "احمد", last_name: "قادری", birth_date_text: "حدود ۱۳۰۰" },
    { temp_id: "p2", first_name: "خدیجه" },
  ],
  relationships: [{ type: "SPOUSE", from: "p1", to: "p2" }],
};

describe("GenealogyProposalSchema", () => {
  it("پیشنهاد معتبر را می‌پذیرد", () => {
    assert.equal(GenealogyProposalSchema.safeParse(valid).success, true);
  });
  it("فقدان temp_id نامعتبر است", () => {
    assert.equal(GenealogyProposalSchema.safeParse({ persons: [{ first_name: "x" }], relationships: [] }).success, false);
  });
  it("نوع رابطهٔ نامعتبر رد می‌شود", () => {
    const bad = { persons: valid.persons, relationships: [{ type: "UNCLE", from: "p1", to: "p2" }] };
    assert.equal(GenealogyProposalSchema.safeParse(bad).success, false);
  });
});

describe("businessValidate", () => {
  it("بدون فرد خطا می‌دهد", () => {
    assert.ok(businessValidate({ persons: [], relationships: [] }).error);
  });
  it("ارجاع ناموجود خطا می‌دهد", () => {
    const r = businessValidate({ persons: valid.persons, relationships: [{ type: "SPOUSE", from: "p1", to: "p99" }] });
    assert.ok(r.error);
  });
  it("خودارجاعی خطا می‌دهد", () => {
    const r = businessValidate({ persons: valid.persons, relationships: [{ type: "SIBLING", from: "p1", to: "p1" }] });
    assert.ok(r.error);
  });
});