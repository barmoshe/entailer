/**
 * The public verification surface, with the honesty discipline baked in
 * (DESIGN §6; `formalize` refs 05 metalogic + 10 vacuity/explosion).
 *
 * Everything routes through the refutation idiom on the tableau (`Γ ∪ {¬φ}`
 * closed ⇒ valid), cross-checked in spirit by the DPLL/oracle property tests.
 * Two disciplines are non-negotiable here:
 *   1. Explosion guard — an inconsistent premise set is *vacuously* valid for any
 *      conclusion; we never return a clean VALID over contradictory premises, we
 *      flag the inconsistency.
 *   2. Out of fragment — non-propositional input yields UNKNOWN, never a guess.
 */
import { andAll, isPropositional, not, type Formula } from "../ast.js";
import type { Assignment } from "../evaluate.js";
import { isSat, isValid } from "../evaluate.js";
import { refute, type ProofTree } from "../tableau.js";

/** Verdicts the deterministic core can license. */
export type ValidityVerdict = "VALID" | "INVALID" | "UNKNOWN";
export type ConsistencyStatus = "SAT" | "UNSAT" | "UNKNOWN";
export type ClassifyKind = "tautology" | "contradiction" | "contingent" | "vacuous";

export interface ValidityResult {
  readonly verdict: ValidityVerdict;
  readonly method: string;
  readonly proof?: ProofTree;
  readonly counterModel?: Assignment;
  /** Set when premises are themselves unsatisfiable: the VALID is vacuous. */
  readonly vacuous?: boolean;
  /** Present on UNKNOWN: why the core could not decide. */
  readonly reason?: string;
}

export interface ConsistencyResult {
  readonly status: ConsistencyStatus;
  readonly method: string;
  readonly model?: Assignment;
  readonly minimalConflictingSubset?: number[]; // indices into the input array
  readonly reason?: string;
}

function allPropositional(formulas: readonly Formula[]): boolean {
  return formulas.every(isPropositional);
}

/**
 * Does `premises ⊨ conclusion`? Closed tableau on `premises ∪ {¬conclusion}`
 * ⇒ VALID (+ proof); open ⇒ INVALID (+ counter-model). Inconsistent premises are
 * reported as vacuously valid **and flagged**, never as a clean VALID.
 */
export function checkValidity(
  premises: readonly Formula[],
  conclusion: Formula,
): ValidityResult {
  if (!allPropositional(premises) || !isPropositional(conclusion)) {
    return {
      verdict: "UNKNOWN",
      method: "out-of-fragment",
      reason: "Non-propositional input; FOL/SMT escalation is deferred (v0.3).",
    };
  }

  // Explosion guard: are the premises even jointly satisfiable?
  const premisesSat = premises.length === 0 ? true : isSat(andAll(premises));

  const result = refute([...premises, not(conclusion)]);
  if (result.closed) {
    return premisesSat
      ? { verdict: "VALID", method: "tableau-refutation", proof: result.tree }
      : {
          verdict: "VALID",
          method: "tableau-refutation",
          proof: result.tree,
          vacuous: true,
          reason:
            "Premises are mutually inconsistent; the argument is vacuously valid. Check consistency.",
        };
  }
  return {
    verdict: "INVALID",
    method: "tableau-refutation",
    counterModel: result.model,
  };
}

/**
 * Is the set of formulas jointly satisfiable? On UNSAT, compute a **minimal**
 * conflicting subset by deletion-based minimization (drop a formula; if the rest
 * is still UNSAT it was redundant). The returned indices point into the input.
 */
export function checkConsistency(formulas: readonly Formula[]): ConsistencyResult {
  if (!allPropositional(formulas)) {
    return {
      status: "UNKNOWN",
      method: "out-of-fragment",
      reason: "Non-propositional input; FOL/SMT escalation is deferred (v0.3).",
    };
  }
  if (formulas.length === 0) return { status: "SAT", method: "tableau", model: {} };

  const whole = refute([...formulas]);
  if (!whole.closed) {
    return { status: "SAT", method: "tableau", model: whole.model };
  }

  // UNSAT — minimize. Work over indices so callers can map back to claims.
  let keep = formulas.map((_, i) => i);
  for (const idx of [...keep]) {
    const candidate = keep.filter((i) => i !== idx);
    if (candidate.length === 0) continue;
    const sub = candidate.map((i) => formulas[i]!);
    if (refute(sub).closed) keep = candidate; // idx was not needed
  }
  return { status: "UNSAT", method: "tableau", minimalConflictingSubset: keep };
}

/**
 * Classify a single formula: tautology / contradiction / contingent. A formula
 * that is unsatisfiable is a contradiction; one true everywhere is a tautology;
 * otherwise contingent. (`vacuous` is reserved for conditionals with an
 * unsatisfiable antecedent — surfaced by the sentence adapter, not here.)
 */
export function classify(f: Formula): { kind: ClassifyKind; reason?: string } {
  if (!isPropositional(f)) {
    return { kind: "contingent", reason: "out-of-fragment" };
  }
  const sat = isSat(f);
  if (!sat) return { kind: "contradiction" };
  if (isValid(f)) return { kind: "tautology" };
  return { kind: "contingent" };
}
