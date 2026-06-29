import { describe, expect, it } from "vitest";
import { forall, pred, v } from "./ast.js";
import {
  OutOfFragmentError,
  allAssignments,
  evaluate,
  firstCounterModel,
  isContradiction,
  isSat,
  isValid,
  satModels,
} from "./evaluate.js";
import { parse } from "./parser.js";

describe("evaluate — connective truth tables", () => {
  const TT = [true, false];

  it("¬", () => {
    expect(evaluate(parse("~a"), { a: true })).toBe(false);
    expect(evaluate(parse("~a"), { a: false })).toBe(true);
  });

  it("∧", () => {
    for (const a of TT)
      for (const b of TT)
        expect(evaluate(parse("a & b"), { a, b })).toBe(a && b);
  });

  it("∨", () => {
    for (const a of TT)
      for (const b of TT)
        expect(evaluate(parse("a | b"), { a, b })).toBe(a || b);
  });

  it("→ (false only when antecedent true, consequent false)", () => {
    expect(evaluate(parse("a -> b"), { a: true, b: false })).toBe(false);
    expect(evaluate(parse("a -> b"), { a: false, b: false })).toBe(true);
    expect(evaluate(parse("a -> b"), { a: true, b: true })).toBe(true);
    expect(evaluate(parse("a -> b"), { a: false, b: true })).toBe(true);
  });

  it("↔", () => {
    for (const a of TT)
      for (const b of TT)
        expect(evaluate(parse("a <-> b"), { a, b })).toBe(a === b);
  });

  it("⊤ / ⊥", () => {
    expect(evaluate(parse("true"), {})).toBe(true);
    expect(evaluate(parse("false"), {})).toBe(false);
  });

  it("treats a missing atom as false", () => {
    expect(evaluate(parse("a"), {})).toBe(false);
  });
});

describe("De Morgan / distribution sanity", () => {
  it("¬(a ∧ b) ≡ ¬a ∨ ¬b", () => {
    expect(isValid(parse("~(a & b) <-> (~a | ~b)"))).toBe(true);
  });
  it("¬(a ∨ b) ≡ ¬a ∧ ¬b", () => {
    expect(isValid(parse("~(a | b) <-> (~a & ~b)"))).toBe(true);
  });
  it("a ∧ (b ∨ c) ≡ (a ∧ b) ∨ (a ∧ c)", () => {
    expect(isValid(parse("(a & (b | c)) <-> ((a & b) | (a & c))"))).toBe(true);
  });
});

describe("allAssignments", () => {
  it("enumerates 2^n distinct assignments", () => {
    const all = [...allAssignments(["a", "b", "c"])];
    expect(all).toHaveLength(8);
    const seen = new Set(all.map((a) => JSON.stringify(a)));
    expect(seen.size).toBe(8);
  });
  it("yields a single empty assignment for no atoms", () => {
    expect([...allAssignments([])]).toEqual([{}]);
  });
});

describe("sat / valid / contradiction", () => {
  it("a → a is valid", () => {
    expect(isValid(parse("a -> a"))).toBe(true);
  });
  it("a ∨ ¬a is valid; a ∧ ¬a is a contradiction", () => {
    expect(isValid(parse("a | ~a"))).toBe(true);
    expect(isContradiction(parse("a & ~a"))).toBe(true);
  });
  it("a → b is contingent (sat but not valid)", () => {
    expect(isSat(parse("a -> b"))).toBe(true);
    expect(isValid(parse("a -> b"))).toBe(false);
  });
  it("satModels returns exactly the satisfying rows", () => {
    const models = satModels(parse("a & b"));
    expect(models).toEqual([{ a: true, b: true }]);
  });
});

describe("firstCounterModel", () => {
  it("witnesses affirming the consequent", () => {
    const cm = firstCounterModel([parse("a -> b"), parse("b")], parse("a"));
    expect(cm).toEqual({ a: false, b: true });
  });
  it("returns null for modus ponens (no counter-model)", () => {
    expect(firstCounterModel([parse("a"), parse("a -> b")], parse("b"))).toBeNull();
  });
});

describe("out of fragment", () => {
  it("rejects a quantified formula", () => {
    const fol = forall("x", pred("P", [v("x")]));
    expect(() => isSat(fol)).toThrowError(OutOfFragmentError);
    expect(() => evaluate(fol, {})).toThrowError(OutOfFragmentError);
  });
});
