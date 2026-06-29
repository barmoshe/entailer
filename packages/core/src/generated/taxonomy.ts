/**
 * GENERATED FILE — do not edit by hand.
 *
 * Produced by `scripts/gen-taxonomy.mjs` from the fenced `entailer-data` blocks in
 * the vendored `formalize` references (plugin/skills/formalize/references/). Run
 * `pnpm gen` to regenerate; the CI drift gate (`pnpm gen && git diff --exit-code`)
 * fails if this file and the prose source disagree.
 *
 * Sources: fallacies ← 07-fallacies-and-reasoning-errors.md; verdicts/severities ← 09-evaluation-rubric.md; honesty ← 99-caveats.md.
 */

export interface FallacyEntry {
  readonly id: string;
  readonly name: string;
  readonly signature: string;
  readonly severity: string;
  readonly kind: string;
}

export const FALLACIES: readonly FallacyEntry[] = [{"id":"affirming-the-consequent","name":"Affirming the consequent","signature":"P→Q, Q ⊢ P","severity":"major","kind":"formal"},{"id":"denying-the-antecedent","name":"Denying the antecedent","signature":"P→Q, ¬P ⊢ ¬Q","severity":"major","kind":"formal"},{"id":"affirming-a-disjunct","name":"Affirming a disjunct","signature":"P∨Q, P ⊢ ¬Q","severity":"major","kind":"formal"},{"id":"illicit-conversion","name":"Illicit conversion","signature":"P→Q as Q→P","severity":"major","kind":"formal"},{"id":"illicit-contraposition","name":"Illicit contraposition","signature":"P→Q as ¬P→¬Q","severity":"major","kind":"formal"},{"id":"undistributed-middle","name":"Undistributed middle","signature":"∀x(A→M), ∀x(C→M) ⊬ ∀x(C→A)","severity":"major","kind":"formal"},{"id":"illicit-major-minor","name":"Illicit major/minor","signature":"term distributed in conclusion but not premise","severity":"major","kind":"formal"}] as const;

export type FallacyId =
  | "affirming-the-consequent"
  | "denying-the-antecedent"
  | "affirming-a-disjunct"
  | "illicit-conversion"
  | "illicit-contraposition"
  | "undistributed-middle"
  | "illicit-major-minor";

export const VERDICTS = ["VALID","INVALID","INCONSISTENT","GAP","UNKNOWN","NO_ISSUE_FOUND"] as const;
export type GeneratedVerdict = (typeof VERDICTS)[number];

export interface SeverityEntry {
  readonly id: string;
  readonly rank: number;
  readonly gloss: string;
}

export const SEVERITIES: readonly SeverityEntry[] = [{"id":"blocker","rank":3,"gloss":"A derivable contradiction, or the central conclusion is invalid/circular."},{"id":"major","rank":2,"gloss":"A formal fallacy or unfillable gap in a load-bearing step."},{"id":"minor","rank":1,"gloss":"A non-fatal informal fallacy, over-strong quantifier, avoidable ambiguity, or vacuous requirement."},{"id":"note","rank":0,"gloss":"Premise-truth caveat, approximated modal/temporal content, or a formalization choice to disclose."}] as const;

export type SeverityId =
  | "blocker"
  | "major"
  | "minor"
  | "note";

/** The ref-99 disclosure attached to every LogicReport. */
export const HONESTY_CONTRACT = "This report certifies the logical validity and consistency of the displayed formalization only. Validity is not truth: a valid argument can rest on false premises, and premise truth is out of scope. The formalization is a translation of the prose and may be unfaithful; audit the symbol dictionary. The absence of a found contradiction is not a proof of consistency.";

export const fallacyById: Readonly<Record<string, FallacyEntry>> = Object.freeze(
  Object.fromEntries(FALLACIES.map((f) => [f.id, f])),
);
