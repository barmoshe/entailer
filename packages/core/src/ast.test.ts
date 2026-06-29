import { describe, expect, it } from "vitest";
import {
  and,
  atom,
  atomsOf,
  bottom,
  cst,
  exists,
  fn,
  forall,
  formulaToString,
  iff,
  implies,
  isPropositional,
  not,
  or,
  pred,
  propAtomKey,
  top,
  v,
} from "./ast.js";

describe("constructors", () => {
  it("build the expected discriminated-union shapes", () => {
    expect(atom("p")).toEqual({ type: "atom", name: "p" });
    expect(not(atom("p"))).toEqual({ type: "not", sub: { type: "atom", name: "p" } });
    expect(and(atom("p"), atom("q"))).toEqual({
      type: "and",
      left: { type: "atom", name: "p" },
      right: { type: "atom", name: "q" },
    });
    expect(top).toEqual({ type: "top" });
    expect(bottom).toEqual({ type: "bottom" });
    expect(v("x")).toEqual({ type: "var", name: "x" });
    expect(cst("a")).toEqual({ type: "func", name: "a", args: [] });
    expect(fn("f", [v("x")])).toEqual({
      type: "func",
      name: "f",
      args: [{ type: "var", name: "x" }],
    });
  });
});

describe("formulaToString", () => {
  it("renders every node type", () => {
    expect(formulaToString(atom("p"))).toBe("p");
    expect(formulaToString(top)).toBe("⊤");
    expect(formulaToString(bottom)).toBe("⊥");
    expect(formulaToString(not(atom("p")))).toBe("¬p");
    expect(formulaToString(and(atom("p"), atom("q")))).toBe("(p ∧ q)");
    expect(formulaToString(or(atom("p"), atom("q")))).toBe("(p ∨ q)");
    expect(formulaToString(implies(atom("p"), atom("q")))).toBe("(p → q)");
    expect(formulaToString(iff(atom("p"), atom("q")))).toBe("(p ↔ q)");
    expect(formulaToString(forall("x", pred("P", [v("x")])))).toBe("∀x.P(x)");
    expect(formulaToString(exists("x", pred("P", [v("x")])))).toBe("∃x.P(x)");
  });

  it("parenthesizes nesting so precedence is unambiguous", () => {
    // ¬(p ∧ q) vs (¬p) ∧ q
    expect(formulaToString(not(and(atom("p"), atom("q"))))).toBe("¬(p ∧ q)");
    expect(formulaToString(and(not(atom("p")), atom("q")))).toBe("(¬p ∧ q)");
    // right-nested implication
    expect(formulaToString(implies(atom("a"), implies(atom("b"), atom("c"))))).toBe(
      "(a → (b → c))",
    );
    // mixed connectives keep their own parens
    expect(
      formulaToString(or(and(atom("p"), atom("q")), not(atom("r")))),
    ).toBe("((p ∧ q) ∨ ¬r)");
  });

  it("renders a ground predicate with nested function term", () => {
    expect(formulaToString(pred("P", [cst("a"), fn("f", [cst("b")])]))).toBe("P(a, f(b))");
  });
});

describe("atomsOf", () => {
  it("dedupes and sorts atom keys", () => {
    const f = and(or(atom("q"), atom("p")), not(atom("q")));
    expect(atomsOf(f)).toEqual(["p", "q"]);
  });

  it("treats structurally identical ground predicates as one key", () => {
    const f = and(pred("P", [cst("a")]), not(pred("P", [cst("a")])));
    expect(atomsOf(f)).toEqual(["P(a)"]);
  });

  it("distinguishes ground predicates with different arguments", () => {
    const f = and(pred("P", [cst("a")]), pred("P", [cst("b")]));
    expect(atomsOf(f)).toEqual(["P(a)", "P(b)"]);
  });

  it("returns nothing for constant formulas", () => {
    expect(atomsOf(top)).toEqual([]);
    expect(atomsOf(bottom)).toEqual([]);
  });
});

describe("isPropositional", () => {
  it("is true for connective trees over atoms and ground predicates", () => {
    expect(isPropositional(atom("p"))).toBe(true);
    expect(isPropositional(top)).toBe(true);
    expect(isPropositional(bottom)).toBe(true);
    expect(isPropositional(implies(atom("p"), and(atom("q"), not(atom("r")))))).toBe(true);
    expect(isPropositional(pred("P", [cst("a"), fn("f", [cst("b")])]))).toBe(true);
  });

  it("is false for anything with a quantifier", () => {
    expect(isPropositional(forall("x", pred("P", [v("x")])))).toBe(false);
    expect(isPropositional(exists("x", pred("P", [v("x")])))).toBe(false);
    expect(isPropositional(and(atom("p"), forall("x", pred("P", [v("x")]))))).toBe(false);
  });

  it("is false for a ground-looking predicate carrying a term variable", () => {
    expect(isPropositional(pred("P", [v("x")]))).toBe(false);
    expect(isPropositional(pred("P", [fn("f", [v("x")])]))).toBe(false);
  });
});

describe("propAtomKey", () => {
  it("is equal for structurally equal ground predicates", () => {
    const a = pred("P", [cst("a"), fn("f", [cst("b")])]);
    const b = pred("P", [cst("a"), fn("f", [cst("b")])]);
    expect(propAtomKey(a)).toBe(propAtomKey(b));
  });

  it("differs when arguments differ", () => {
    expect(propAtomKey(pred("P", [cst("a")]))).not.toBe(propAtomKey(pred("P", [cst("b")])));
  });

  it("uses the atom name for plain atoms", () => {
    expect(propAtomKey(atom("p"))).toBe("p");
  });
});
