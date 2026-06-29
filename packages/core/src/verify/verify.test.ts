import { describe, expect, it } from "vitest";
import { forall, pred, v } from "../ast.js";
import { parse } from "../parser.js";
import { checkConsistency, checkValidity, classify } from "./index.js";

describe("checkValidity", () => {
  it("modus ponens ⇒ VALID with a proof", () => {
    const r = checkValidity([parse("a"), parse("a -> b")], parse("b"));
    expect(r.verdict).toBe("VALID");
    expect(r.proof).toBeDefined();
    expect(r.vacuous).toBeUndefined();
  });

  it("affirming the consequent ⇒ INVALID with the {a:false,b:true} counter-model", () => {
    const r = checkValidity([parse("a -> b"), parse("b")], parse("a"));
    expect(r.verdict).toBe("INVALID");
    expect(r.counterModel).toEqual({ a: false, b: true });
  });

  it("flags vacuous validity over inconsistent premises", () => {
    const r = checkValidity([parse("a"), parse("~a")], parse("b"));
    expect(r.verdict).toBe("VALID");
    expect(r.vacuous).toBe(true);
    expect(r.reason).toMatch(/inconsistent/i);
  });

  it("returns UNKNOWN for a quantified (out-of-fragment) input", () => {
    const fol = forall("x", pred("P", [v("x")]));
    const r = checkValidity([fol], parse("b"));
    expect(r.verdict).toBe("UNKNOWN");
    expect(r.method).toBe("out-of-fragment");
  });
});

describe("checkConsistency", () => {
  it("reports SAT with a model for a satisfiable set", () => {
    const r = checkConsistency([parse("a -> b"), parse("a")]);
    expect(r.status).toBe("SAT");
    expect(r.model).toBeDefined();
  });

  it("reports UNSAT with a minimal conflicting subset", () => {
    // R1: a -> b, R2: a, R3: ~b  (all three needed); plus a harmless R4: c
    const r = checkConsistency([parse("a -> b"), parse("a"), parse("~b"), parse("c")]);
    expect(r.status).toBe("UNSAT");
    expect(r.minimalConflictingSubset).toEqual([0, 1, 2]); // c (index 3) excluded
  });

  it("returns UNKNOWN for out-of-fragment input", () => {
    const r = checkConsistency([forall("x", pred("P", [v("x")]))]);
    expect(r.status).toBe("UNKNOWN");
  });
});

describe("classify", () => {
  it("tautology / contradiction / contingent", () => {
    expect(classify(parse("a | ~a")).kind).toBe("tautology");
    expect(classify(parse("a & ~a")).kind).toBe("contradiction");
    expect(classify(parse("a -> b")).kind).toBe("contingent");
  });
});
