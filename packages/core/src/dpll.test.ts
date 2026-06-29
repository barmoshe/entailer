import { describe, expect, it } from "vitest";
import { atomsOf } from "./ast.js";
import { dpllSat } from "./dpll.js";
import { evaluate, isSat } from "./evaluate.js";
import { parse } from "./parser.js";
import { randomBatch } from "./testkit.js";

describe("dpllSat — basics", () => {
  it("a ∧ ¬a is unsat", () => {
    expect(dpllSat(parse("a & ~a")).sat).toBe(false);
  });
  it("a ∨ b is sat with a satisfying model", () => {
    const r = dpllSat(parse("a | b"));
    expect(r.sat).toBe(true);
    if (r.sat) expect(evaluate(parse("a | b"), r.model)).toBe(true);
  });
  it("¬(a → a) is unsat (the negation of a tautology)", () => {
    expect(dpllSat(parse("~(a -> a)")).sat).toBe(false);
  });
  it("⊤ is sat, ⊥ is unsat", () => {
    expect(dpllSat(parse("true")).sat).toBe(true);
    expect(dpllSat(parse("false")).sat).toBe(false);
  });
});

describe("DPLL ≡ truth-table oracle (property)", () => {
  it("agrees on sat/unsat for 600 random formulas, and models verify", () => {
    const batch = randomBatch(0xc0ffee, 600, 5);
    for (const f of batch) {
      const r = dpllSat(f);
      expect(r.sat).toBe(isSat(f));
      if (r.sat) {
        // a returned model must actually satisfy the original formula
        expect(evaluate(f, r.model)).toBe(true);
        // the model only mentions the formula's own atoms
        const keys = new Set(atomsOf(f));
        for (const k of Object.keys(r.model)) expect(keys.has(k)).toBe(true);
      }
    }
  });
});
