const B = "http://127.0.0.1:8787/api";
async function req(method, path, body, token) {
  const res = await fetch(B + path, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}
function ok(name, cond, extra = "") {
  console.log(`${cond ? "✓" : "✗"} ${name}${extra ? " — " + extra : ""}`);
  if (!cond) process.exitCode = 1;
}
(async () => {
  const email = `ramazan${Date.now()}@test.com`;
  let r = await req("POST", "/auth/register", { name: "رمضان قادری", email, password: "password123" });
  const token = r.json.token;
  ok("register", r.status === 201 && !!token);

  r = await req("GET", "/auth/me", null, token);
  ok("me", r.status === 200 && r.json.user.email === email);

  r = await req("GET", "/auth/me");
  ok("me unauthorized blocks", r.status === 401);

  r = await req("POST", "/families", { name: "خانواده قادری" }, token);
  const fam = r.json.family?.id;
  ok("create family", r.status === 201 && !!fam);

  // unauthorized family access (new user)
  const r2 = await req("POST", "/auth/register", { name: "سارا", email: `sara${Date.now()}@t.com`, password: "password123" });
  const token2 = r2.json.token;
  const rBlock = await req("GET", `/families/${fam}`, null, token2);
  ok("family privacy enforced", rBlock.status === 403);

  const mk = (o, token) => req("POST", "/persons", o, token);
  const p1 = (await mk({ family_id: fam, first_name: "احمد", last_name: "قادری", gender: "MALE", birth_date_text: "حدود ۱۳۰۰", birth_place: "پاوه", is_living: true }, token)).json.person.id;
  const p2 = (await mk({ family_id: fam, first_name: "خدیجه", gender: "FEMALE", is_living: true }, token)).json.person.id;
  const p3 = (await mk({ family_id: fam, first_name: "محمد", last_name: "قادری", gender: "MALE", is_living: true }, token)).json.person.id;
  ok("persons created", !!(p1 && p2 && p3));

  r = await req("POST", "/relationships", { family_id: fam, person_a_id: p1, person_b_id: p2, relationship_type: "SPOUSE" }, token);
  ok("spouse rel", r.status === 201);
  r = await req("POST", "/relationships", { family_id: fam, person_a_id: p1, person_b_id: p3, relationship_type: "PARENT" }, token);
  ok("parent rel", r.status === 201);

  r = await req("GET", `/families/${fam}`, null, token);
  ok("family stats", r.status === 200 && r.json.stats.persons === 3, `stats=${JSON.stringify(r.json.stats)}`);
  ok("root detected", r.json.rootId === p1);

  r = await req("GET", `/persons/${p3}/ancestors`, null, token);
  ok("ancestors of mohammad", r.json.persons?.some((p) => p.id === p1), JSON.stringify(r.json.persons?.map((p) => p.first_name)));

  r = await req("GET", `/persons/${p1}/family`, null, token);
  ok("family view", r.json.persons?.length >= 3, `gen=${JSON.stringify(r.json.generations?.map((g) => g.map((p) => p.first_name)))}`);

  r = await req("GET", `/relationships/path?fromId=${p1}&toId=${p3}`, null, token);
  ok("path ahmad->mohammad explained", r.json.explain?.includes("فرزند"), r.json.explain);

  // duplicate detection
  r = await req("POST", "/persons/check-duplicates", { family_id: fam, first_name: "احمد", last_name: "قادری" }, token);
  ok("duplicate detection", r.json.duplicates?.length >= 1, `dupes=${r.json.duplicates?.length}`);

  // persian-ish search
  r = await req("GET", `/search?familyId=${fam}&q=قادری`, null, token);
  ok("search by last name", r.json.results?.length >= 2, `hits=${r.json.results?.length}`);

  // AI proposal (rules provider)
  r = await req("POST", "/ai/propose", { family_id: fam, text: "پدربزرگ من احمد قادری بود. همسرش خدیجه بود. پسرم محمد با فاطمه ازدواج کرد." }, token);
  ok("ai propose", r.status === 201, `people=${r.json.proposal?.persons?.length} rels=${r.json.proposal?.relationships?.length} warn=${r.json.warning}`);
  const propId = r.json.id;
  if (r.json.proposal?.persons?.length > 0) {
    r = await req("POST", `/ai/proposals/${propId}/apply`, {}, token);
    ok("ai confirm apply", r.status === 200, `applied=${r.json.appliedPersonIds?.length}`);
  }

  console.log("\nDONE");
})();