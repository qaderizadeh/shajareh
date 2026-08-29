export function uuid(): string {
  return crypto.randomUUID();
}

export function sessionToken(): string {
  return "sess_" + uuid().replace(/-/g, "") + Math.random().toString(36).slice(2);
}

export function mediaKey(familyId: string, kind: "PHOTO" | "DOCUMENT", ext: string): string {
  const safe = uuid().replace(/-/g, "");
  return `families/${familyId}/${kind.toLowerCase()}/${safe}.${ext}`;
}