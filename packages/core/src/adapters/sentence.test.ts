import { describe, expect, it } from "vitest";
import { evaluateSentence } from "./sentence.js";
import type { FormalizedArgument } from "../ir.js";

describe("evaluateSentence — classification (string input)", () => {
  it("a ∨ ¬a ⇒ tautology (VALID) with a proof", () => {
    const r = evaluateSentence("a | ~a");
    expect(r.verdict).toBe("VALID");
    expect(r.validity.status).toBe("VALID");
    expect(r.validity.proof).toBeDefined();
    expect(r.symbolDictionary.length).toBeGreaterThan(0);
  });

  it("a ∧ ¬a ⇒ contradiction (INCONSISTENT) with a conflict witness", () => {
    const r = evaluateSentence("a & ~a");
    expect(r.verdict).toBe("INCONSISTENT");
    expect(r.consistency.status).toBe("UNSAT");
    expect(r.consistency.minimalConflictingSubset).toEqual([0]);
  });

  it("a → b ⇒ contingent (NO_ISSUE_FOUND)", () => {
    const r = evaluateSentence("a -> b");
    expect(r.verdict).toBe("NO_ISSUE_FOUND");
    expect(r.consistency.status).toBe("SAT");
    expect(r.consistency.noContradictionFound).toBe(true);
  });

  it("flags a vacuously-true conditional", () => {
    const r = evaluateSentence("(a & ~a) -> b");
    expect(r.verdict).toBe("VALID");
    expect(r.validity.vacuous).toBe(true);
    expect(r.soundnessRisk.some((s) => /vacuous/i.test(s.note))).toBe(true);
  });
});

describe("evaluateSentence — supplied IR", () => {
  const ir: FormalizedArgument = {
    logic: "PROP",
    symbols: [{ kind: "atom", name: "p", arity: 0, gloss: "the system is up", source: "stated", spans: [] }],
    premises: [{ ast: { type: "or", left: { type: "atom", name: "p" }, right: { type: "not", sub: { type: "atom", name: "p" } } }, role: "premise", source: "stated", spans: [] }],
    outOfScope: [],
    translationConfidence: { band: "high", score: 0.9, signals: [] },
  };

  it("uses the supplied symbol dictionary and gloss", () => {
    const r = evaluateSentence({ argument: ir, english: "the system is up or it is not" });
    expect(r.verdict).toBe("VALID");
    expect(r.symbolDictionary).toContainEqual({ symbol: "p", gloss: "the system is up" });
    expect(r.formalization[0]!.english).toBe("the system is up or it is not");
  });

  it("forces UNKNOWN when the supplied translation confidence is low", () => {
    const lowConf: FormalizedArgument = {
      ...ir,
      translationConfidence: { band: "low", score: 0.2, signals: ["round-trip-disagreement"] },
    };
    const r = evaluateSentence({ argument: lowConf });
    expect(r.verdict).toBe("UNKNOWN");
  });
});

describe("evaluateSentence — out of fragment", () => {
  it("returns UNKNOWN for a quantified sentence", () => {
    const fol: FormalizedArgument = {
      logic: "FOL",
      symbols: [{ kind: "pred", name: "P", arity: 1, gloss: "P holds of x", source: "stated", spans: [] }],
      premises: [
        {
          ast: { type: "forall", variable: "x", sub: { type: "pred", name: "P", args: [{ type: "var", name: "x" }] } },
          role: "premise",
          source: "stated",
          spans: [],
        },
      ],
      outOfScope: [],
      translationConfidence: { band: "high", score: 0.9, signals: [] },
    };
    const r = evaluateSentence({ argument: fol });
    expect(r.verdict).toBe("UNKNOWN");
    expect(r.validity.method).toBe("out-of-fragment");
  });
});
