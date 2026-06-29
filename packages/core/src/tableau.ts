/**
 * Propositional analytic (semantic) tableau — the design's primary verification
 * method (DESIGN §6/§8).
 *
 * Decomposes a set of formulas (all asserted true) with the standard α/β rules.
 * A branch closes when it carries a literal and its negation (or ⊥ / ¬⊤). If
 * every branch closes, the set is unsatisfiable and we return a serializable proof
 * tree whose leaves are all marked `closedBy`. If some branch saturates open, that
 * branch is read off as a satisfying assignment.
 *
 * Closed ⇔ the input set is unsatisfiable — proven equivalent to the truth-table
 * oracle by property test before anything trusts it.
 */
import { formulaToString, not, propAtomKey, type Formula } from "./ast.js";
import type { Assignment } from "./evaluate.js";

export interface TableauNode {
  readonly id: number;
  readonly label: string;
  readonly rule?: string;
  /** When this node closed a branch: the id of the literal it contradicts. */
  closedBy?: number;
}
export interface TableauEdge {
  readonly from: number;
  readonly to: number;
}
export interface ProofTree {
  readonly nodes: TableauNode[];
  readonly edges: TableauEdge[];
  readonly rootId: number;
}

export type TableauResult =
  | { readonly closed: true; readonly tree: ProofTree }
  | { readonly closed: false; readonly openBranch: string[]; readonly model: Assignment };

type Decomp =
  | { kind: "skip" }
  | { kind: "close" }
  | { kind: "literal"; key: string; sign: boolean }
  | { kind: "alpha"; parts: Formula[]; rule: string }
  | { kind: "beta"; options: [Formula[], Formula[]]; rule: string };

/** How a formula (asserted true) decomposes under the tableau rules. */
function classify(f: Formula): Decomp {
  switch (f.type) {
    case "top":
      return { kind: "skip" };
    case "bottom":
      return { kind: "close" };
    case "atom":
    case "pred":
      return { kind: "literal", key: propAtomKey(f), sign: true };
    case "and":
      return { kind: "alpha", parts: [f.left, f.right], rule: "∧" };
    case "or":
      return { kind: "beta", options: [[f.left], [f.right]], rule: "∨" };
    case "implies":
      return { kind: "beta", options: [[not(f.left)], [f.right]], rule: "→" };
    case "iff":
      return {
        kind: "beta",
        options: [
          [f.left, f.right],
          [not(f.left), not(f.right)],
        ],
        rule: "↔",
      };
    case "forall":
    case "exists":
      throw new Error(`tableau: out of fragment (${f.type})`);
    case "not": {
      const s = f.sub;
      switch (s.type) {
        case "top":
          return { kind: "close" };
        case "bottom":
          return { kind: "skip" };
        case "atom":
        case "pred":
          return { kind: "literal", key: propAtomKey(s), sign: false };
        case "not":
          return { kind: "alpha", parts: [s.sub], rule: "¬¬" };
        case "and":
          return { kind: "beta", options: [[not(s.left)], [not(s.right)]], rule: "¬∧" };
        case "or":
          return { kind: "alpha", parts: [not(s.left), not(s.right)], rule: "¬∨" };
        case "implies":
          return { kind: "alpha", parts: [s.left, not(s.right)], rule: "¬→" };
        case "iff":
          return {
            kind: "beta",
            options: [
              [s.left, not(s.right)],
              [not(s.left), s.right],
            ],
            rule: "¬↔",
          };
        case "forall":
        case "exists":
          throw new Error(`tableau: out of fragment (¬${s.type})`);
      }
    }
  }
}

interface LitRecord {
  readonly sign: boolean;
  readonly id: number;
}
interface Pending {
  readonly f: Formula;
  readonly id: number;
}

/** Refute a set of formulas — closed proof if unsatisfiable, else open model. */
export function refute(formulas: readonly Formula[]): TableauResult {
  const nodes: TableauNode[] = [];
  const edges: TableauEdge[] = [];
  let counter = 0;

  const addNode = (label: string, parentId: number | null, rule?: string): number => {
    const id = counter++;
    nodes.push(rule === undefined ? { id, label } : { id, label, rule });
    if (parentId !== null) edges.push({ from: parentId, to: id });
    return id;
  };

  const fmt = (f: Formula): string => formulaToString(f);

  // Seed the spine with the input formulas.
  let tip: number | null = null;
  let rootId = -1;
  const queue: Pending[] = [];
  for (const f of formulas) {
    const id = addNode(fmt(f), tip);
    if (rootId === -1) rootId = id;
    tip = id;
    queue.push({ f, id });
  }
  if (rootId === -1) {
    // empty set: trivially satisfiable
    return { closed: false, openBranch: [], model: {} };
  }

  const expand = (
    work: Pending[],
    lits: ReadonlyMap<string, LitRecord>,
    branchTip: number,
  ): TableauResult => {
    const q: Pending[] = [...work];
    const seen = new Map(lits);

    while (q.length > 0) {
      const { f, id } = q.shift()!;
      const d = classify(f);
      switch (d.kind) {
        case "skip":
          continue;
        case "close":
          nodes[id]!.closedBy = id;
          return { closed: true, tree: { nodes, edges, rootId } };
        case "literal": {
          const existing = seen.get(d.key);
          if (existing && existing.sign !== d.sign) {
            nodes[id]!.closedBy = existing.id;
            return { closed: true, tree: { nodes, edges, rootId } };
          }
          if (!existing) seen.set(d.key, { sign: d.sign, id });
          continue;
        }
        case "alpha": {
          let p = branchTip;
          for (const part of d.parts) {
            const nid = addNode(fmt(part), p, d.rule);
            p = nid;
            q.push({ f: part, id: nid });
          }
          branchTip = p;
          continue;
        }
        case "beta": {
          const runOption = (parts: Formula[]): TableauResult => {
            let p = branchTip;
            const added: Pending[] = [];
            for (const part of parts) {
              const nid = addNode(fmt(part), p, d.rule);
              p = nid;
              added.push({ f: part, id: nid });
            }
            return expand([...q, ...added], seen, p);
          };
          const left = runOption(d.options[0]);
          if (!left.closed) return left;
          const right = runOption(d.options[1]);
          if (!right.closed) return right;
          return { closed: true, tree: { nodes, edges, rootId } };
        }
      }
    }

    // Saturated, open: read the branch off as a model.
    const model: Assignment = {};
    const openBranch: string[] = [];
    for (const [key, rec] of seen) {
      model[key] = rec.sign;
      openBranch.push(rec.sign ? key : `¬${key}`);
    }
    return { closed: false, openBranch, model };
  };

  return expand(queue, new Map(), tip as number);
}
