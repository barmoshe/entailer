/**
 * Formula AST for Entailer.
 *
 * One AST spans propositional and first-order logic — propositional is the
 * arity-0 fragment (`Atom`), FOL adds predicates, terms, and quantifiers.
 * The v0.1 verifier is propositional-only; it recognizes quantified/non-ground
 * structure and reports it as out-of-fragment (→ UNKNOWN) rather than guessing.
 */

// ---- Terms (FOL) ----------------------------------------------------------

export interface Var {
  readonly type: "var";
  readonly name: string;
}
export interface FuncTerm {
  readonly type: "func";
  readonly name: string;
  readonly args: readonly Term[];
}
export type Term = Var | FuncTerm;

export const v = (name: string): Var => ({ type: "var", name });
/** A constant is a 0-ary function term. */
export const cst = (name: string): FuncTerm => ({ type: "func", name, args: [] });
export const fn = (name: string, args: readonly Term[]): FuncTerm => ({
  type: "func",
  name,
  args,
});

// ---- Formulas -------------------------------------------------------------

export interface Atom {
  readonly type: "atom";
  readonly name: string;
}
export interface Pred {
  readonly type: "pred";
  readonly name: string;
  readonly args: readonly Term[];
}
export interface Not {
  readonly type: "not";
  readonly sub: Formula;
}
export interface And {
  readonly type: "and";
  readonly left: Formula;
  readonly right: Formula;
}
export interface Or {
  readonly type: "or";
  readonly left: Formula;
  readonly right: Formula;
}
export interface Implies {
  readonly type: "implies";
  readonly left: Formula;
  readonly right: Formula;
}
export interface Iff {
  readonly type: "iff";
  readonly left: Formula;
  readonly right: Formula;
}
export interface Bottom {
  readonly type: "bottom";
}
export interface Top {
  readonly type: "top";
}
export interface Forall {
  readonly type: "forall";
  readonly variable: string;
  readonly sub: Formula;
}
export interface Exists {
  readonly type: "exists";
  readonly variable: string;
  readonly sub: Formula;
}

export type Formula =
  | Atom
  | Pred
  | Not
  | And
  | Or
  | Implies
  | Iff
  | Bottom
  | Top
  | Forall
  | Exists;

// ---- Constructors ---------------------------------------------------------

export const atom = (name: string): Atom => ({ type: "atom", name });
export const pred = (name: string, args: readonly Term[]): Pred => ({
  type: "pred",
  name,
  args,
});
export const not = (sub: Formula): Not => ({ type: "not", sub });
export const and = (left: Formula, right: Formula): And => ({ type: "and", left, right });
export const or = (left: Formula, right: Formula): Or => ({ type: "or", left, right });
export const implies = (left: Formula, right: Formula): Implies => ({
  type: "implies",
  left,
  right,
});
export const iff = (left: Formula, right: Formula): Iff => ({ type: "iff", left, right });
export const bottom: Bottom = { type: "bottom" };
export const top: Top = { type: "top" };
export const forall = (variable: string, sub: Formula): Forall => ({
  type: "forall",
  variable,
  sub,
});
export const exists = (variable: string, sub: Formula): Exists => ({
  type: "exists",
  variable,
  sub,
});

/** Left-associated conjunction of a non-empty list (⊤ for the empty list). */
export const andAll = (fs: readonly Formula[]): Formula =>
  fs.length === 0 ? top : fs.reduce((acc, f) => and(acc, f));

// ---- Term + formula utilities ---------------------------------------------

function termToString(t: Term): string {
  if (t.type === "var") return t.name;
  if (t.args.length === 0) return t.name;
  return `${t.name}(${t.args.map(termToString).join(", ")})`;
}

/**
 * A canonical, parenthesized rendering of a ground propositional formula.
 * Ground predicate applications render to a stable string so they can serve as
 * propositional atom keys (see `propAtomKey`).
 */
export function formulaToString(f: Formula): string {
  switch (f.type) {
    case "atom":
      return f.name;
    case "pred":
      return f.args.length === 0
        ? f.name
        : `${f.name}(${f.args.map(termToString).join(", ")})`;
    case "top":
      return "⊤";
    case "bottom":
      return "⊥";
    case "not":
      return `¬${formulaToString(f.sub)}`;
    case "and":
      return `(${formulaToString(f.left)} ∧ ${formulaToString(f.right)})`;
    case "or":
      return `(${formulaToString(f.left)} ∨ ${formulaToString(f.right)})`;
    case "implies":
      return `(${formulaToString(f.left)} → ${formulaToString(f.right)})`;
    case "iff":
      return `(${formulaToString(f.left)} ↔ ${formulaToString(f.right)})`;
    case "forall":
      return `∀${f.variable}.${formulaToString(f.sub)}`;
    case "exists":
      return `∃${f.variable}.${formulaToString(f.sub)}`;
  }
}

/** True iff the term contains no variables. */
function termIsGround(t: Term): boolean {
  if (t.type === "var") return false;
  return t.args.every(termIsGround);
}

/**
 * Is this formula in the propositional fragment the v0.1 verifier handles?
 * Atoms and ground predicate applications are fine; quantifiers and any term
 * variable put it out of fragment.
 */
export function isPropositional(f: Formula): boolean {
  switch (f.type) {
    case "atom":
    case "top":
    case "bottom":
      return true;
    case "pred":
      return f.args.every(termIsGround);
    case "not":
      return isPropositional(f.sub);
    case "and":
    case "or":
    case "implies":
    case "iff":
      return isPropositional(f.left) && isPropositional(f.right);
    case "forall":
    case "exists":
      return false;
  }
}

/**
 * The propositional key for an atom or ground predicate — the string the
 * SAT/tableau layer treats as a single boolean variable. Two syntactically
 * identical ground predicates share a key (and therefore a truth value).
 */
export function propAtomKey(f: Atom | Pred): string {
  return formulaToString(f);
}

/** The set of propositional atom keys occurring in a formula, sorted. */
export function atomsOf(f: Formula): string[] {
  const acc = new Set<string>();
  const walk = (g: Formula): void => {
    switch (g.type) {
      case "atom":
      case "pred":
        acc.add(propAtomKey(g));
        return;
      case "top":
      case "bottom":
        return;
      case "not":
        walk(g.sub);
        return;
      case "and":
      case "or":
      case "implies":
      case "iff":
        walk(g.left);
        walk(g.right);
        return;
      case "forall":
      case "exists":
        walk(g.sub);
        return;
    }
  };
  walk(f);
  return [...acc].sort();
}
