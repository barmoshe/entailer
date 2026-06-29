import { describe, expect, it } from "vitest";
import { evaluatePrompt, recoverConclusionIndex } from "./prompt.js";

describe("recoverConclusionIndex", () => {
  it("finds a leading indicator word", () => {
    expect(recoverConclusionIndex(["it rained", "the ground is wet", "therefore it rained"])).toBe(2);
  });
  it("finds an embedded 'so' / 'thus'", () => {
    expect(recoverConclusionIndex(["all men are mortal", "thus Socrates is mortal"])).toBe(1);
  });
  it("returns -1 when no indicator is present", () => {
    expect(recoverConclusionIndex(["a holds", "b holds"])).toBe(-1);
  });
});

describe("evaluatePrompt", () => {
  const symbols = [
    { symbol: "p", gloss: "the deploy succeeded" },
    { symbol: "q", gloss: "the release is live" },
  ];

  it("recovers the conclusion and validates a modus-ponens prompt", () => {
    const r = evaluatePrompt({
      claims: [
        { dsl: "p", text: "the deploy succeeded" },
        { dsl: "p -> q", text: "if the deploy succeeded the release is live" },
        { dsl: "q", text: "therefore the release is live" },
      ],
      symbols,
    });
    expect(r.target.tier).toBe(2);
    expect(r.verdict).toBe("VALID");
  });

  it("catches an invalid prompt with a counter-model", () => {
    const r = evaluatePrompt({
      claims: [
        { dsl: "p -> q", text: "if the deploy succeeded the release is live" },
        { dsl: "q", text: "the release is live" },
        { dsl: "p", text: "so the deploy succeeded" },
      ],
      symbols,
    });
    expect(r.verdict).toBe("INVALID");
    expect(r.validity.counterModel).toEqual({ p: false, q: true });
  });

  it("treats a flagged enthymeme as premise-supplied", () => {
    const r = evaluatePrompt({
      claims: [
        { dsl: "p", text: "the deploy succeeded" },
        { dsl: "p -> q", text: "deploys go live", supplied: true },
        { dsl: "q", text: "therefore the release is live" },
      ],
      symbols,
    });
    expect(r.verdict).toBe("VALID");
    const suppliedRole = r.formalization.find((f) => f.role === "premise-supplied");
    expect(suppliedRole).toBeDefined();
  });

  it("degrades to a consistency check when no conclusion is recoverable", () => {
    const r = evaluatePrompt({
      claims: [
        { dsl: "req -> logged", text: "every request is logged" },
        { dsl: "health -> ~logged", text: "health-checks are not logged" },
        { dsl: "health & req", text: "healthz is a request" },
      ],
      symbols: [
        { symbol: "req", gloss: "request" },
        { symbol: "logged", gloss: "logged" },
        { symbol: "health", gloss: "health-check" },
      ],
    });
    expect(r.verdict).toBe("INCONSISTENT");
    expect(r.consistency.minimalConflictingSubset).toEqual([0, 1, 2]);
  });
});
