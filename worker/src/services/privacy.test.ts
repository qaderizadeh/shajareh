import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PrivacyService } from "./privacy";
import type { User } from "../env";

const admin: User = { id: "u1", name: "ادمین", email: "a@x.com", avatar: null, role: "ADMIN", created_at: "", updated_at: "" };
const viewer: User = { id: "u2", name: "بیننده", email: "v@x.com", avatar: null, role: "USER", created_at: "", updated_at: "" };
const member: User = { id: "u3", name: "عضو", email: "m@x.com", avatar: null, role: "USER", created_at: "", updated_at: "" };

function makeService(membershipRow: unknown) {
  const env: any = {
    DB: {
      prepare: () => ({ bind: () => ({ first: async () => membershipRow }) }),
    },
  };
  return new PrivacyService(env);
}

describe("PrivacyService.canRead", () => {
  it("ادمین بدون عضویت هم می‌خواند", () => {
    assert.equal(PrivacyService.prototype.canRead(admin, null), true);
  });
  it("کاربر عادی بدون عضویت نمی‌خواند", () => {
    assert.equal(PrivacyService.prototype.canRead(viewer, null), false);
  });
  it("کاربر با عضویت فعال می‌خواند", () => {
    assert.equal(PrivacyService.prototype.canRead(member, { familyId: "f1", role: "VIEWER", status: "ACTIVE" }), true);
  });
});

describe("PrivacyService.canWrite", () => {
  it("بیننده نمی‌نویسد", () => {
    assert.equal(PrivacyService.prototype.canWrite(member, { familyId: "f1", role: "VIEWER", status: "ACTIVE" }), false);
  });
  it("ویرایشگر می‌نویسد", () => {
    assert.equal(PrivacyService.prototype.canWrite(member, { familyId: "f1", role: "EDITOR", status: "ACTIVE" }), true);
  });
  it("ادمین بدون عضویت هم می‌نویسد", () => {
    assert.equal(PrivacyService.prototype.canWrite(admin, null), true);
  });
});

describe("PrivacyService.getMembership", () => {
  it("عضویت فعال را برمی‌گرداند", async () => {
    const svc = makeService({ family_id: "f1", role: "EDITOR", status: "ACTIVE" });
    assert.deepEqual(await svc.getMembership("u3", "f1"), { familyId: "f1", role: "EDITOR", status: "ACTIVE" });
  });
  it("بدون ردیف null می‌دهد", async () => {
    const svc = makeService(null);
    assert.equal(await svc.getMembership("u3", "f1"), null);
  });
});