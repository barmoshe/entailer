/**
 * Machine-consumable taxonomy for Entailer.
 *
 * This is the hand-authored seed for what DESIGN §4.2 will eventually generate into
 * `src/generated/taxonomy.ts` from fenced data blocks in the vendored `formalize`
 * references (with a `gen && git diff --exit-code` drift gate — BUILD_PLAN T14).
 * Until that codegen lands, this module is the single source of truth and every entry
 * cites the `formalize` reference it is sourced from (`.claude/skills/formalize/
 * references/NN-*.md`).
 *
 * This file lands the **deferred tail — references 21 and 22** — into the taxonomy:
 *   - ref 21 (formal semantics & controlled NL): the `GENERALIZED_QUANTIFIER` fragment
 *     and the `generalized-quantifier` + `ambiguous-reading` flattened kinds.
 *   - ref 22 (type theory & Curry–Howard): the `HOL` and `DEPENDENT_TYPE_THEORY`
 *     fragments and the `PROOF_ASSISTANT` escalation target, plus the `higher-order`
 *     flattened kind.
 *
 * Discipline preserved: a fragment that is not native to the core is **flagged or
 * escalated, never silently forced into PL/FOL**, and anything outside a decidable
 * fragment yields `UNKNOWN`, never a guessed VALID/INVALID.
 */

/** The `formalize` reference number an entry is sourced from. */
export type SourceRef =
  | "02" | "03" | "08" | "15" | "16" | "17" | "18" | "19" | "20" | "21" | "22";

/** References introduced by this task (the deferred tail). */
export const TAIL_REFS = ["21", "22"] as const;

export type Decidability =
  | "decidable"
  | "semi-decidable"
  | "undecidable"
  | "not-classical";

// ---- Escalation targets ---------------------------------------------------

export type EscalationTargetId = "SAT" | "SMT" | "MODEL_CHECKER" | "PROOF_ASSISTANT";

export interface EscalationTarget {
  readonly id: EscalationTargetId;
  readonly label: string;
  /** Concrete tools, current to mid-2026 (see refs 08/15/18/22). */
  readonly tools: readonly string[];
  readonly note: string;
  readonly ref: SourceRef;
}

export const ESCALATION_TARGETS: readonly EscalationTarget[] = [
  {
    id: "SAT",
    label: "Propositional SAT solver",
    tools: ["MiniSat", "CaDiCaL", "Kissat"],
    note: "Decidable, NP-complete; sound model / UNSAT certificate.",
    ref: "15",
  },
  {
    id: "SMT",
    label: "SMT solver (SAT modulo theories)",
    tools: ["Z3"],
    note: "Decision procedure on decidable fragments; may return `unknown` on quantifiers — a first-class answer, not a bug.",
    ref: "08",
  },
  {
    id: "MODEL_CHECKER",
    label: "Temporal model checker",
    tools: ["TLA+/TLC", "SPIN", "NuSMV/nuXmv"],
    note: "Decidable but bounded to the explored finite-state configuration; LTL/CTL specs.",
    ref: "18",
  },
  {
    id: "PROOF_ASSISTANT",
    label: "Interactive proof assistant",
    tools: ["Lean 4", "Rocq", "Isabelle/HOL"],
    note: "Not push-button: machine-checks a proof GIVEN a small trusted kernel. Escalating here commits to supplying a constructive, fully formal proof object (Curry–Howard: the proof IS a term whose type is the theorem).",
    ref: "22", // <- deferred tail
  },
] as const;

// ---- Logic fragments ------------------------------------------------------

export type LogicFragmentId =
  | "PL"
  | "FOL"
  | "MODAL"
  | "DEONTIC"
  | "TEMPORAL"
  | "PROBABILISTIC"
  | "FUZZY"
  | "GENERALIZED_QUANTIFIER" // ref 21
  | "HOL" // ref 22
  | "DEPENDENT_TYPE_THEORY"; // ref 22

export interface LogicFragment {
  readonly id: LogicFragmentId;
  readonly label: string;
  readonly description: string;
  readonly decidability: Decidability;
  /** True only for the fragment the v0.1 deterministic core decides natively. */
  readonly nativeInCore: boolean;
  /** Where the engine escalates this fragment, or `null` when it is flag-only. */
  readonly escalateTo: EscalationTargetId | null;
  readonly ref: SourceRef;
}

export const LOGIC_FRAGMENTS: readonly LogicFragment[] = [
  {
    id: "PL",
    label: "Propositional logic",
    description: "Truth-functional connectives over atoms; the v0.1 native fragment.",
    decidability: "decidable",
    nativeInCore: true,
    escalateTo: null,
    ref: "02",
  },
  {
    id: "FOL",
    label: "First-order logic",
    description: "Quantifiers + predicates over a domain; only semi-decidable.",
    decidability: "semi-decidable",
    nativeInCore: false,
    escalateTo: "SMT",
    ref: "03",
  },
  {
    id: "MODAL",
    label: "Modal logic (□/◇)",
    description: "Necessity/possibility, Kripke semantics, K/T/S4/S5. Propositional modal logics are decidable. \"must/could/necessarily\".",
    decidability: "decidable",
    nativeInCore: false,
    escalateTo: null,
    ref: "18",
  },
  {
    id: "DEONTIC",
    label: "Deontic logic (O/P/F)",
    description: "Obligation/permission/prohibition; \"shall/may/must not\" in specs & contracts. Carries contrary-to-duty paradoxes — never encode \"shall\" as material implication.",
    decidability: "decidable",
    nativeInCore: false,
    escalateTo: null,
    ref: "18",
  },
  {
    id: "TEMPORAL",
    label: "Temporal logic (LTL/CTL)",
    description: "Behavior over time: globally/eventually/next/until. \"always/eventually/until/before\".",
    decidability: "decidable",
    nativeInCore: false,
    escalateTo: "MODEL_CHECKER",
    ref: "18",
  },
  {
    id: "PROBABILISTIC",
    label: "Probabilistic reasoning",
    description: "Graded belief; Bayes; \"likely/probably\". A probabilistic conditional is NOT the material conditional (P(B|A) ≠ P(A|B)).",
    decidability: "not-classical",
    nativeInCore: false,
    escalateTo: null,
    ref: "19",
  },
  {
    id: "FUZZY",
    label: "Fuzzy logic / vagueness",
    description: "Degrees of truth in [0,1]; vague predicates (\"tall/reasonable/soon\") and the sorites paradox have no crisp truth value.",
    decidability: "not-classical",
    nativeInCore: false,
    escalateTo: null,
    ref: "19",
  },
  {
    id: "GENERALIZED_QUANTIFIER",
    label: "Generalized quantifiers",
    description: "Determiners beyond ∀/∃ (\"most/few/exactly n\"). \"most A are B\" (|A∩B| > |A\\B|) is NOT first-order definable (Ehrenfeucht–Fraïssé argument) — a real expressiveness limit, not translation laziness.",
    decidability: "not-classical",
    nativeInCore: false,
    escalateTo: null,
    ref: "21", // <- deferred tail
  },
  {
    id: "HOL",
    label: "Higher-order logic",
    description: "Quantifies over predicates/functions. More expressive (categorical arithmetic) but NO complete recursive proof system — escalate, don't promise completeness.",
    decidability: "undecidable",
    nativeInCore: false,
    escalateTo: "PROOF_ASSISTANT",
    ref: "22", // <- deferred tail
  },
  {
    id: "DEPENDENT_TYPE_THEORY",
    label: "Dependent type theory",
    description: "Π/Σ types, Martin-Löf / Calculus of Inductive Constructions (Rocq, Lean). Proofs-as-programs (Curry–Howard); proof CHECKING is cheap but the logic is undecidable.",
    decidability: "undecidable",
    nativeInCore: false,
    escalateTo: "PROOF_ASSISTANT",
    ref: "22", // <- deferred tail
  },
] as const;

// ---- Flattened / out-of-scope content kinds -------------------------------
// What the translator marks when prose carries content the binary validity verdict
// cannot represent. Mirrors LogicReport.flattened[].kind and IR outOfScope[].kind.

export type FlattenedKindId =
  | "modal"
  | "deontic"
  | "temporal"
  | "probabilistic"
  | "causal"
  | "vague"
  | "higher-order" // ref 22
  | "generalized-quantifier" // ref 21
  | "ambiguous-reading"; // ref 21

export interface FlattenedKind {
  readonly id: FlattenedKindId;
  readonly label: string;
  readonly description: string;
  /** The reference the evaluator routes this kind to for handling. */
  readonly routeTo: SourceRef;
  readonly ref: SourceRef;
}

export const FLATTENED_KINDS: readonly FlattenedKind[] = [
  { id: "modal", label: "Modal content", description: "necessity/possibility (\"must/could\").", routeTo: "18", ref: "18" },
  { id: "deontic", label: "Deontic content", description: "obligation/permission (\"shall/may\").", routeTo: "18", ref: "18" },
  { id: "temporal", label: "Temporal content", description: "ordering over time (\"always/eventually\").", routeTo: "18", ref: "18" },
  { id: "probabilistic", label: "Probabilistic content", description: "graded likelihood (\"likely/probably\").", routeTo: "19", ref: "19" },
  { id: "causal", label: "Causal content", description: "\"A causes/leads to B\"; correlation ≠ causation (Pearl's ladder).", routeTo: "20", ref: "20" },
  { id: "vague", label: "Vague content", description: "borderline predicates (\"tall/reasonable\"); the sorites.", routeTo: "19", ref: "19" },
  {
    id: "higher-order",
    label: "Higher-order content",
    description: "quantifies over predicates/properties (\"for every property P …\"); beyond FOL.",
    routeTo: "22",
    ref: "22", // <- deferred tail
  },
  {
    id: "generalized-quantifier",
    label: "Generalized-quantifier content",
    description: "\"most/few/exactly n\" — not first-order definable.",
    routeTo: "21",
    ref: "21", // <- deferred tail
  },
  {
    id: "ambiguous-reading",
    label: "Ambiguous reading",
    description: "scope ambiguity or donkey-anaphora — surface BOTH readings (DRT); ambiguity is a property of the sentence, not a failure of the reader. Recommend controlled NL (ACE) to disambiguate, never assume it.",
    routeTo: "21",
    ref: "21", // <- deferred tail
  },
] as const;

// ---- Lookups & helpers ----------------------------------------------------

export const escalationTargetById: Readonly<Record<EscalationTargetId, EscalationTarget>> =
  Object.freeze(Object.fromEntries(ESCALATION_TARGETS.map((t) => [t.id, t]))) as Record<
    EscalationTargetId,
    EscalationTarget
  >;

export const logicFragmentById: Readonly<Record<LogicFragmentId, LogicFragment>> =
  Object.freeze(Object.fromEntries(LOGIC_FRAGMENTS.map((f) => [f.id, f]))) as Record<
    LogicFragmentId,
    LogicFragment
  >;

export const flattenedKindById: Readonly<Record<FlattenedKindId, FlattenedKind>> =
  Object.freeze(Object.fromEntries(FLATTENED_KINDS.map((k) => [k.id, k]))) as Record<
    FlattenedKindId,
    FlattenedKind
  >;

/** Every taxonomy entry introduced by a given reference (e.g. the tail "21"/"22"). */
export function entriesFromRef(
  ref: SourceRef,
): { fragments: LogicFragment[]; escalations: EscalationTarget[]; flattenedKinds: FlattenedKind[] } {
  return {
    fragments: LOGIC_FRAGMENTS.filter((f) => f.ref === ref),
    escalations: ESCALATION_TARGETS.filter((t) => t.ref === ref),
    flattenedKinds: FLATTENED_KINDS.filter((k) => k.ref === ref),
  };
}

/** True for any fragment the v0.1 core cannot decide natively (→ flag or escalate). */
export const isOutOfNativeFragment = (id: LogicFragmentId): boolean =>
  !logicFragmentById[id].nativeInCore;
