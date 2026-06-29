import { describe, expect, it } from "vitest";
import { atomsOf, cst, fn, formulaToString, pred } from "./ast.js";
import { ParseError, parse } from "./parser.js";

/** parse → render → parse → render must be a fixed point. */
function roundTrip(input: string): string {
  const once = formulaToString(parse(input));
  const twice = formulaToString(parse(once));
  expect(twice).toBe(once);
  return once;
}

describe("round-trip", () => {
  it("is stable through the canonical rendering", () => {
    expect(roundTrip("a -> b -> c")).toBe("(a → (b → c))");
    expect(roundTrip("~a & b")).toBe("(¬a ∧ b)");
    expect(roundTrip("(p | q) -> r")).toBe("((p ∨ q) → r)");
    expect(roundTrip("p <-> ~q")).toBe("(p ↔ ¬q)");
    expect(roundTrip("P(a, f(b))")).toBe("P(a, f(b))");
  });
});

describe("precedence and associativity", () => {
  it("makes implication right-associative", () => {
    expect(formulaToString(parse("a -> b -> c"))).toBe("(a → (b → c))");
  });

  it("binds ¬ tighter than ∧", () => {
    expect(formulaToString(parse("~a & b"))).toBe("(¬a ∧ b)");
  });

  it("binds ∧ tighter than ∨", () => {
    expect(formulaToString(parse("a | b & c"))).toBe("(a ∨ (b ∧ c))");
  });

  it("binds ∨ tighter than →", () => {
    expect(formulaToString(parse("a | b -> c"))).toBe("((a ∨ b) → c)");
  });

  it("makes ↔ the loosest", () => {
    expect(formulaToString(parse("a -> b <-> c"))).toBe("((a → b) ↔ c)");
  });

  it("respects explicit parentheses", () => {
    expect(formulaToString(parse("a & (b | c)"))).toBe("(a ∧ (b ∨ c))");
  });
});

describe("ASCII ≡ Unicode", () => {
  const pairs: ReadonlyArray<readonly [string, string]> = [
    ["~a", "¬a"],
    ["a & b", "a ∧ b"],
    ["a /\\ b", "a ∧ b"],
    ["a | b", "a ∨ b"],
    ["a \\/ b", "a ∨ b"],
    ["a -> b", "a → b"],
    ["a => b", "a → b"],
    ["a <-> b", "a ↔ b"],
    ["a <=> b", "a ↔ b"],
    ["!a", "¬a"],
    ["true", "⊤"],
    ["false", "⊥"],
  ];
  it.each(pairs)("'%s' parses the same as '%s'", (ascii, unicode) => {
    expect(formulaToString(parse(ascii))).toBe(formulaToString(parse(unicode)));
  });
});

describe("terms and predicates", () => {
  it("parses a ground predicate with a nested function term", () => {
    expect(parse("P(a, f(b))")).toEqual(pred("P", [cst("a"), fn("f", [cst("b")])]));
  });

  it("treats a bare identifier as an atom and an applied one as a predicate", () => {
    expect(parse("p")).toEqual({ type: "atom", name: "p" });
    expect(atomsOf(parse("P(a) & P(a)"))).toEqual(["P(a)"]);
  });
});

describe("errors", () => {
  it("throws ParseError with a column on a dangling operator", () => {
    expect(() => parse("a &")).toThrowError(ParseError);
    try {
      parse("a &");
    } catch (e) {
      expect(e).toBeInstanceOf(ParseError);
      expect((e as ParseError).column).toBe(3);
    }
  });

  it("throws on an unbalanced paren", () => {
    expect(() => parse("(a & b")).toThrowError(ParseError);
  });

  it("throws on an unexpected character", () => {
    try {
      parse("a @ b");
    } catch (e) {
      expect(e).toBeInstanceOf(ParseError);
      expect((e as ParseError).column).toBe(2);
    }
  });

  it("throws on trailing junk", () => {
    expect(() => parse("a b")).toThrowError(ParseError);
  });
});
