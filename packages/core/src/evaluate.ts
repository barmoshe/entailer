/**
 * The exhaustive truth-table oracle — the correctness anchor.
 *
 * Obviously correct by construction (it enumerates every assignment), if slow.
 * Every faster engine (DPLL, tableau) is validated against this by property test
 * before it is trusted. Propositional only: quantified / non-ground input is
 * rejected with {@link OutOfFragmentError} rather than guessed at.
 */
import { atomsOf, isPropositional, propAtomKey, type Formula } from "./ast.js";

/** A propositional truth assignment, keyed by {@link propAtomKey}. */
export type Assignment = Record<string, boolean>;

/** Thrown when an engine that only handles propositional logic is given FOL. */
export class OutOfFragmentError extends Error {
  constructor(message = "Formula is not in the propositional fragment") {
    super(message);
    this.name = "OutOfFragmentError";
  }
}

function assertPropositional(f: Formula): void {
  if (!isPropositional(f)) throw new OutOfFragmentError(`Out of fragment: ${f.type}`);
}

/**
 * Evaluate a ground propositional formula under an assignment. An atom key
 * missing from `assignment` is treated as `false`.
 */
export function evaluate(f: Formula, assignment: Assignment): boolean {
  switch (f.type) {
    case "top":
      return true;
    case "bottom":
      return false;
    case "atom":
    case "pred":
      return assignment[propAtomKey(f)] ?? false;
    case "not":
      return !evaluate(f.sub, assignment);
    case "and":
      return evaluate(f.left, assignment) && evaluate(f.right, assignment);
    case "or":
      return evaluate(f.left, assignment) || evaluate(f.right, assignment);
    case "implies":
      return !evaluate(f.left, assignment) || evaluate(f.right, assignment);
    case "iff":
      return evaluate(f.left, assignment) === evaluate(f.right, assignment);
    case "forall":
    case "exists":
      throw new OutOfFragmentError(`Out of fragment: ${f.type}`);
  }
}

/** Every total assignment over the given atom keys — 2^n of them. */
export function* allAssignments(atomKeys: readonly string[]): Iterable<Assignment> {
  const n = atomKeys.length;
  const total = 2 ** n;
  for (let mask = 0; mask < total; mask++) {
    const a: Assignment = {};
    for (let i = 0; i < n; i++) {
      a[atomKeys[i]!] = (mask & (1 << i)) !== 0;
    }
    yield a;
  }
}

/** The atom keys shared across a list of formulas, deduped and sorted. */
function jointAtoms(formulas: readonly Formula[]): string[] {
  const acc = new Set<string>();
  for (const f of formulas) for (const k of atomsOf(f)) acc.add(k);
  return [...acc].sort();
}

/** Every assignment that satisfies `f`. */
export function satModels(f: Formula): Assignment[] {
  assertPropositional(f);
  const keys = atomsOf(f);
  const models: Assignment[] = [];
  for (const a of allAssignments(keys)) {
    if (evaluate(f, a)) models.push(a);
  }
  return models;
}

/** Is `f` satisfiable — true under at least one assignment? */
export function isSat(f: Formula): boolean {
  assertPropositional(f);
  const keys = atomsOf(f);
  for (const a of allAssignments(keys)) {
    if (evaluate(f, a)) return true;
  }
  return false;
}

/** Is `f` valid — true under every assignment (a tautology)? */
export function isValid(f: Formula): boolean {
  assertPropositional(f);
  const keys = atomsOf(f);
  for (const a of allAssignments(keys)) {
    if (!evaluate(f, a)) return false;
  }
  return true;
}

/** Is `f` a contradiction — false under every assignment? */
export function isContradiction(f: Formula): boolean {
  return !isSat(f);
}

/**
 * The first assignment (in enumeration order) that makes every premise true and
 * the conclusion false — i.e. a counter-model witnessing `premises ⊭ conclusion`.
 * Returns `null` when the entailment holds.
 */
export function firstCounterModel(
  premises: readonly Formula[],
  conclusion: Formula,
): Assignment | null {
  for (const f of premises) assertPropositional(f);
  assertPropositional(conclusion);
  const keys = jointAtoms([...premises, conclusion]);
  for (const a of allAssignments(keys)) {
    if (premises.every((p) => evaluate(p, a)) && !evaluate(conclusion, a)) return a;
  }
  return null;
}
