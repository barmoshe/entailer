/* ------------------------------------------------------------------ *
 * Scenario data + shared types for the interactive exhibits. Real
 * software artifacts, formalized by hand for the demo (the LLM
 * translator lives in @entailer/translate; these pages stay
 * deterministic). Verdicts are always computed live from @entailer/core,
 * never hard-coded — this file only carries the English + the glosses +
 * the DSL formalization the reader is invited to audit.
 * ------------------------------------------------------------------ */

export type Badge =
  | "valid"
  | "invalid"
  | "inconsistent"
  | "inconclusive"
  | "unknown"
  | "neutral";

export interface Stmt {
  label: string;
  english: string;
  dsl: string;
  role: "requirement" | "premise" | "conclusion" | "claim";
}

export interface Gloss {
  symbol: string;
  gloss: string;
}

export interface Scenario {
  id: string;
  kind: "spec" | "argument" | "claim";
  tag: string;
  title: string;
  blurb: string;
  hint: string;
  glosses: Gloss[];
  statements: Stmt[];
}

export type CertKind = "conflict" | "counter-model" | "proof" | "classify" | "none";

export interface Analysis {
  badge: Badge;
  label: string;
  summary: string;
  glosses: Gloss[];
  statements: Stmt[];
  highlight: Set<number>;
  cert: {
    kind: CertKind;
    heading: string;
    blurb: string;
    model?: { gloss: string; value: boolean }[];
    conflict?: { label: string; english: string }[];
  } | null;
  contract: string;
  truthTable?: string | null;
}

export const HONESTY =
  "Entailer judges validity and consistency, not truth. It assumes the formalization above is faithful — that is the human's job to check, which is why it is always shown.";

/* ---- Home playground scenarios ------------------------------------ */

export const SCENARIOS: Scenario[] = [
  {
    id: "spec",
    kind: "spec",
    tag: "spec",
    title: "A spec that cannot be satisfied",
    blurb: "Three requirements, written pages apart. No system can honor all three at once.",
    hint: "expects INCONSISTENT",
    glosses: [
      { symbol: "req", gloss: "the call is an incoming request" },
      { symbol: "logged", gloss: "the call is written to the audit log" },
      { symbol: "health", gloss: "the call is a /healthz health-check" },
    ],
    statements: [
      { label: "R1", english: "Every incoming request must be written to the audit log.", dsl: "req -> logged", role: "requirement" },
      { label: "R2", english: "Health-check calls must never be written to the audit log.", dsl: "health -> ~logged", role: "requirement" },
      { label: "R3", english: "Our /healthz health-check is itself an incoming request.", dsl: "health & req", role: "requirement" },
    ],
  },
  {
    id: "fallacy",
    kind: "argument",
    tag: "argument",
    title: "An argument that does not follow",
    blurb: "It sounds airtight in code review. It commits a classic fallacy, and entailer hands you the counterexample.",
    hint: "expects INVALID",
    glosses: [
      { symbol: "admin", gloss: "Dana is an admin" },
      { symbol: "del", gloss: "Dana can delete records" },
    ],
    statements: [
      { label: "P1", english: "Every admin can delete records.", dsl: "admin -> del", role: "premise" },
      { label: "P2", english: "Dana can delete records.", dsl: "del", role: "premise" },
      { label: "∴", english: "Therefore Dana is an admin.", dsl: "admin", role: "conclusion" },
    ],
  },
  {
    id: "valid",
    kind: "argument",
    tag: "argument",
    title: "An argument that does follow",
    blurb: "Same surface shape as the last one, but this one is airtight — valid no matter whether the premises are actually true.",
    hint: "expects VALID",
    glosses: [
      { symbol: "deployed", gloss: "the build was deployed to production" },
      { symbol: "passed", gloss: "the test suite passed" },
    ],
    statements: [
      { label: "P1", english: "If the build was deployed to production, the test suite passed.", dsl: "deployed -> passed", role: "premise" },
      { label: "P2", english: "The test suite did not pass.", dsl: "~passed", role: "premise" },
      { label: "∴", english: "Therefore the build was not deployed to production.", dsl: "~deployed", role: "conclusion" },
    ],
  },
  {
    id: "vacuous",
    kind: "claim",
    tag: "single claim",
    title: "A claim that is true for the wrong reason",
    blurb: "A guarantee whose precondition can never hold is 'technically true'. Entailer flags it as vacuous instead of laundering it into a real assurance.",
    hint: "expects VACUOUS",
    glosses: [
      { symbol: "on", gloss: "the feature flag is on" },
      { symbol: "cache", gloss: "the response may be cached" },
    ],
    statements: [
      { label: "C", english: "If the flag is both on and off, the response may be cached.", dsl: "(on & ~on) -> cache", role: "claim" },
    ],
  },
];

/* ---- Showcase: a gallery of classic formal fallacies -------------- *
 * Each is a two-premise argument whose conclusion does NOT follow; the
 * engine computes the counter-model live. `pattern` names the schema.
 * ------------------------------------------------------------------ */

export const FALLACIES: (Scenario & { pattern: string })[] = [
  {
    id: "affirming-consequent",
    kind: "argument",
    tag: "affirming the consequent",
    pattern: "P → Q, Q ⊢ P",
    title: "Affirming the consequent",
    blurb: "The consequent holding does not force the antecedent — many other things could make Q true.",
    hint: "INVALID",
    glosses: [
      { symbol: "rain", gloss: "it rained" },
      { symbol: "wet", gloss: "the ground is wet" },
    ],
    statements: [
      { label: "P1", english: "If it rained, the ground is wet.", dsl: "rain -> wet", role: "premise" },
      { label: "P2", english: "The ground is wet.", dsl: "wet", role: "premise" },
      { label: "∴", english: "Therefore it rained.", dsl: "rain", role: "conclusion" },
    ],
  },
  {
    id: "denying-antecedent",
    kind: "argument",
    tag: "denying the antecedent",
    pattern: "P → Q, ¬P ⊢ ¬Q",
    title: "Denying the antecedent",
    blurb: "Ruling out the antecedent says nothing about the consequent, which can still hold on its own.",
    hint: "INVALID",
    glosses: [
      { symbol: "admin", gloss: "the user is an admin" },
      { symbol: "read", gloss: "the user can read the file" },
    ],
    statements: [
      { label: "P1", english: "If the user is an admin, they can read the file.", dsl: "admin -> read", role: "premise" },
      { label: "P2", english: "The user is not an admin.", dsl: "~admin", role: "premise" },
      { label: "∴", english: "Therefore they cannot read the file.", dsl: "~read", role: "conclusion" },
    ],
  },
  {
    id: "affirming-disjunct",
    kind: "argument",
    tag: "affirming a disjunct",
    pattern: "P ∨ Q, P ⊢ ¬Q",
    title: "Affirming a disjunct",
    blurb: "Inclusive 'or' allows both to hold, so establishing one does not rule out the other.",
    hint: "INVALID",
    glosses: [
      { symbol: "cache", gloss: "the response is cached" },
      { symbol: "fresh", gloss: "the response is fresh" },
    ],
    statements: [
      { label: "P1", english: "The response is cached or fresh.", dsl: "cache | fresh", role: "premise" },
      { label: "P2", english: "The response is cached.", dsl: "cache", role: "premise" },
      { label: "∴", english: "Therefore it is not fresh.", dsl: "~fresh", role: "conclusion" },
    ],
  },
  {
    id: "illicit-conversion",
    kind: "argument",
    tag: "illicit conversion",
    pattern: "P → Q ⊢ Q → P",
    title: "Illicit conversion",
    blurb: "A conditional does not license its converse; the arrow only points one way.",
    hint: "INVALID",
    glosses: [
      { symbol: "paid", gloss: "the invoice is paid" },
      { symbol: "shipped", gloss: "the order shipped" },
    ],
    statements: [
      { label: "P1", english: "If the invoice is paid, the order shipped.", dsl: "paid -> shipped", role: "premise" },
      { label: "∴", english: "Therefore if the order shipped, the invoice is paid.", dsl: "shipped -> paid", role: "conclusion" },
    ],
  },
  {
    id: "illicit-contraposition",
    kind: "argument",
    tag: "illicit contraposition",
    pattern: "P → Q ⊢ ¬P → ¬Q",
    title: "Illicit contraposition",
    blurb: "The valid contrapositive is ¬Q → ¬P. Negating both parts in place is not the same move.",
    hint: "INVALID",
    glosses: [
      { symbol: "prod", gloss: "the build is a production build" },
      { symbol: "signed", gloss: "the build is signed" },
    ],
    statements: [
      { label: "P1", english: "If it is a production build, it is signed.", dsl: "prod -> signed", role: "premise" },
      { label: "∴", english: "Therefore if it is not a production build, it is not signed.", dsl: "~prod -> ~signed", role: "conclusion" },
    ],
  },
  {
    id: "undistributed-middle",
    kind: "argument",
    tag: "undistributed middle",
    pattern: "P → M, Q → M ⊢ P → Q",
    title: "Undistributed middle",
    blurb: "Sharing a consequence does not make two things the same; the shared middle term connects nothing.",
    hint: "INVALID",
    glosses: [
      { symbol: "cat", gloss: "it is a cat" },
      { symbol: "dog", gloss: "it is a dog" },
      { symbol: "animal", gloss: "it is an animal" },
    ],
    statements: [
      { label: "P1", english: "Every cat is an animal.", dsl: "cat -> animal", role: "premise" },
      { label: "P2", english: "Every dog is an animal.", dsl: "dog -> animal", role: "premise" },
      { label: "∴", english: "Therefore every cat is a dog.", dsl: "cat -> dog", role: "conclusion" },
    ],
  },
];

/* ---- Showcase: valid inference forms (contrast to the fallacies) --- */

export const VALID_FORMS: (Scenario & { pattern: string })[] = [
  {
    id: "modus-ponens",
    kind: "argument",
    tag: "modus ponens",
    pattern: "P → Q, P ⊢ Q",
    title: "Modus ponens",
    blurb: "The workhorse: assert the conditional and its antecedent, detach the consequent.",
    hint: "VALID",
    glosses: [
      { symbol: "merged", gloss: "the PR is merged" },
      { symbol: "reviewed", gloss: "the PR was reviewed" },
    ],
    statements: [
      { label: "P1", english: "If the PR is merged, it was reviewed.", dsl: "merged -> reviewed", role: "premise" },
      { label: "P2", english: "The PR is merged.", dsl: "merged", role: "premise" },
      { label: "∴", english: "Therefore it was reviewed.", dsl: "reviewed", role: "conclusion" },
    ],
  },
  {
    id: "modus-tollens",
    kind: "argument",
    tag: "modus tollens",
    pattern: "P → Q, ¬Q ⊢ ¬P",
    title: "Modus tollens",
    blurb: "Deny the consequent to deny the antecedent — the valid mirror of denying the antecedent.",
    hint: "VALID",
    glosses: [
      { symbol: "deployed", gloss: "the build was deployed" },
      { symbol: "passed", gloss: "the tests passed" },
    ],
    statements: [
      { label: "P1", english: "If the build was deployed, the tests passed.", dsl: "deployed -> passed", role: "premise" },
      { label: "P2", english: "The tests did not pass.", dsl: "~passed", role: "premise" },
      { label: "∴", english: "Therefore the build was not deployed.", dsl: "~deployed", role: "conclusion" },
    ],
  },
  {
    id: "hypothetical-syllogism",
    kind: "argument",
    tag: "hypothetical syllogism",
    pattern: "P → Q, Q → R ⊢ P → R",
    title: "Hypothetical syllogism",
    blurb: "Conditionals chain: transitivity of implication lets you compose two rules into one.",
    hint: "VALID",
    glosses: [
      { symbol: "commit", gloss: "code is committed" },
      { symbol: "ci", gloss: "CI runs" },
      { symbol: "deploy", gloss: "a deploy is triggered" },
    ],
    statements: [
      { label: "P1", english: "If code is committed, CI runs.", dsl: "commit -> ci", role: "premise" },
      { label: "P2", english: "If CI runs, a deploy is triggered.", dsl: "ci -> deploy", role: "premise" },
      { label: "∴", english: "Therefore if code is committed, a deploy is triggered.", dsl: "commit -> deploy", role: "conclusion" },
    ],
  },
  {
    id: "disjunctive-syllogism",
    kind: "argument",
    tag: "disjunctive syllogism",
    pattern: "P ∨ Q, ¬P ⊢ Q",
    title: "Disjunctive syllogism",
    blurb: "Given a genuine either/or, ruling one side out forces the other.",
    hint: "VALID",
    glosses: [
      { symbol: "primary", gloss: "the primary handled the request" },
      { symbol: "replica", gloss: "the replica handled the request" },
    ],
    statements: [
      { label: "P1", english: "The primary or the replica handled the request.", dsl: "primary | replica", role: "premise" },
      { label: "P2", english: "The primary did not handle it.", dsl: "~primary", role: "premise" },
      { label: "∴", english: "Therefore the replica handled it.", dsl: "replica", role: "conclusion" },
    ],
  },
];
