// A deliberate concept leak: one identifier names both `member` and `guest`,
// which access.yaml declares mutually exclusive (member is-not guest).
// `entailer domain --lens access.yaml --repo .` flags this as a rank-1 verdict.
export function grantMemberGuest(id: string) {
  return db.members.find(id);
}

// These are fine: each identifier names a single concept.
export const member = { tier: "paid" };
export const guest = { tier: "anonymous" };

declare const db: { members: { find(id: string): unknown } };
