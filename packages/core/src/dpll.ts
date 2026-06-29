/**
 * Native DPLL SAT backend over a Tseitin CNF encoding.
 *
 * The real propositional SAT engine: linear-size CNF via Tseitin (an auxiliary
 * variable per connective), then DPLL with unit propagation + pure-literal
 * elimination. Proven equivalent to the truth-table oracle by property test
 * before anything trusts it. Pure TypeScript, zero deps — part of the kernel.
 */
import { propAtomKey, type Formula } from "./ast.js";
import type { Assignment } from "./evaluate.js";

/** A CNF literal: a positive variable id, or its negation as a negative id. */
type Lit = number;
type Clause = Lit[];

interface Cnf {
  readonly clauses: Clause[];
  /** Variable id → original atom key (aux/gate vars are absent). */
  readonly atomOfVar: Map<number, string>;
}

/** Tseitin transform: returns CNF clauses asserting `f` is true. */
function toCnf(f: Formula): Cnf {
  const varOfAtom = new Map<string, number>();
  const atomOfVar = new Map<number, string>();
  const clauses: Clause[] = [];
  let nextVar = 1;

  const fresh = (): number => nextVar++;
  const atomVar = (key: string): number => {
    let id = varOfAtom.get(key);
    if (id === undefined) {
      id = fresh();
      varOfAtom.set(key, id);
      atomOfVar.set(id, key);
    }
    return id;
  };

  let trueVarCache: number | null = null;
  const trueVar = (): number => {
    if (trueVarCache === null) {
      trueVarCache = fresh();
      clauses.push([trueVarCache]); // force ⊤ true
    }
    return trueVarCache;
  };

  /** Encode `f`, returning the literal whose truth equals `f`'s truth. */
  const encode = (g: Formula): Lit => {
    switch (g.type) {
      case "top":
        return trueVar();
      case "bottom":
        return -trueVar();
      case "atom":
      case "pred":
        return atomVar(propAtomKey(g));
      case "not":
        return -encode(g.sub);
      case "and": {
        const a = encode(g.left);
        const b = encode(g.right);
        const x = fresh();
        // x ↔ (a ∧ b)
        clauses.push([-x, a], [-x, b], [x, -a, -b]);
        return x;
      }
      case "or": {
        const a = encode(g.left);
        const b = encode(g.right);
        const x = fresh();
        // x ↔ (a ∨ b)
        clauses.push([-x, a, b], [x, -a], [x, -b]);
        return x;
      }
      case "implies": {
        const a = encode(g.left);
        const b = encode(g.right);
        const x = fresh();
        // x ↔ (¬a ∨ b)
        clauses.push([-x, -a, b], [x, a], [x, -b]);
        return x;
      }
      case "iff": {
        const a = encode(g.left);
        const b = encode(g.right);
        const x = fresh();
        // x ↔ (a ↔ b)
        clauses.push([-x, -a, b], [-x, a, -b], [x, a, b], [x, -a, -b]);
        return x;
      }
      case "forall":
      case "exists":
        throw new Error(`DPLL: out of fragment (${g.type})`);
    }
  };

  const top = encode(f);
  clauses.push([top]); // assert the whole formula
  return { clauses, atomOfVar };
}

/** Result of a DPLL solve. The model is over original atom keys only. */
export type DpllResult =
  | { readonly sat: true; readonly model: Assignment }
  | { readonly sat: false };

/** DPLL with unit propagation + pure-literal elimination. */
function solve(clauses: Clause[]): Map<number, boolean> | null {
  // assignment: var id → boolean
  const assign = new Map<number, boolean>();

  /** True if literal is falsified, satisfied, or unassigned under `assign`. */
  const litState = (lit: Lit): "sat" | "unsat" | "open" => {
    const val = assign.get(Math.abs(lit));
    if (val === undefined) return "open";
    const positive = lit > 0;
    return val === positive ? "sat" : "unsat";
  };

  const dpll = (): boolean => {
    // Unit propagation
    let changed = true;
    while (changed) {
      changed = false;
      for (const clause of clauses) {
        let unassigned: Lit | null = null;
        let satisfied = false;
        let openCount = 0;
        for (const lit of clause) {
          const st = litState(lit);
          if (st === "sat") {
            satisfied = true;
            break;
          }
          if (st === "open") {
            openCount++;
            unassigned = lit;
          }
        }
        if (satisfied) continue;
        if (openCount === 0) return false; // empty (all-falsified) clause → conflict
        if (openCount === 1 && unassigned !== null) {
          assign.set(Math.abs(unassigned), unassigned > 0);
          changed = true;
        }
      }
    }

    // Are all clauses satisfied?
    let allSat = true;
    for (const clause of clauses) {
      if (!clause.some((lit) => litState(lit) === "sat")) {
        allSat = false;
        break;
      }
    }
    if (allSat) return true;

    // Pure-literal elimination among still-relevant clauses
    const polarity = new Map<number, { pos: boolean; neg: boolean }>();
    for (const clause of clauses) {
      if (clause.some((lit) => litState(lit) === "sat")) continue;
      for (const lit of clause) {
        if (litState(lit) !== "open") continue;
        const v = Math.abs(lit);
        const p = polarity.get(v) ?? { pos: false, neg: false };
        if (lit > 0) p.pos = true;
        else p.neg = true;
        polarity.set(v, p);
      }
    }
    for (const [v, p] of polarity) {
      if (p.pos !== p.neg) {
        const snapshot = new Map(assign);
        assign.set(v, p.pos);
        if (dpll()) return true;
        restore(snapshot);
        return false;
      }
    }

    // Branch on the first unassigned variable
    let branchVar: number | null = null;
    for (const clause of clauses) {
      if (clause.some((lit) => litState(lit) === "sat")) continue;
      for (const lit of clause) {
        if (litState(lit) === "open") {
          branchVar = Math.abs(lit);
          break;
        }
      }
      if (branchVar !== null) break;
    }
    if (branchVar === null) return true; // nothing left to assign

    for (const tryVal of [true, false]) {
      const snapshot = new Map(assign);
      assign.set(branchVar, tryVal);
      if (dpll()) return true;
      restore(snapshot);
    }
    return false;
  };

  const restore = (snapshot: Map<number, boolean>): void => {
    assign.clear();
    for (const [k, val] of snapshot) assign.set(k, val);
  };

  return dpll() ? assign : null;
}

/** Solve a propositional formula's satisfiability via DPLL. */
export function dpllSat(f: Formula): DpllResult {
  const { clauses, atomOfVar } = toCnf(f);
  const result = solve(clauses);
  if (result === null) return { sat: false };
  const model: Assignment = {};
  for (const [varId, key] of atomOfVar) {
    model[key] = result.get(varId) ?? false; // unconstrained atoms default false
  }
  return { sat: true, model };
}
