import { describe, expect, it } from "vitest";
import {
  HONESTY_CONTRACT,
  buildReport,
  logicReportSchema,
  toMarkdown,
  type BuildReportInput,
} from "./report.js";

const baseValid: BuildReportInput = {
  target: { tier: 1 },
  verdict: "VALID",
  validity: { status: "VALID", method: "tableau-refutation", proof: { nodes: [], edges: [], rootId: 0 } },
  consistency: { status: "SAT" },
  symbolDictionary: [{ symbol: "p", gloss: "it rains" }],
  formalization: [
    { id: "c1", english: "if it rains the ground is wet", formal: "(p → q)", role: "premise", logicSystem: "PL" },
  ],
};

describe("honesty invariants (schema-enforced)", () => {
  it("a VALID report with an empty symbol dictionary fails schema validation", () => {
    expect(() => buildReport({ ...baseValid, symbolDictionary: [] })).toThrow();
  });

  it("a VALID report with an empty formalization fails", () => {
    expect(() => buildReport({ ...baseValid, formalization: [] })).toThrow();
  });

  it("INVALID without a counter-model fails", () => {
    expect(() =>
      buildReport({
        ...baseValid,
        verdict: "INVALID",
        validity: { status: "INVALID", method: "tableau-refutation" },
      }),
    ).toThrow();
  });

  it("INVALID with a counter-model passes", () => {
    expect(() =>
      buildReport({
        ...baseValid,
        verdict: "INVALID",
        validity: {
          status: "INVALID",
          method: "tableau-refutation",
          counterModel: { p: false, q: true },
        },
      }),
    ).not.toThrow();
  });

  it("INCONSISTENT requires a non-empty minimal conflicting subset", () => {
    expect(() =>
      buildReport({
        ...baseValid,
        verdict: "INCONSISTENT",
        consistency: { status: "UNSAT" },
      }),
    ).toThrow();
    expect(() =>
      buildReport({
        ...baseValid,
        verdict: "INCONSISTENT",
        consistency: { status: "UNSAT", minimalConflictingSubset: [0, 1, 2] },
      }),
    ).not.toThrow();
  });

  it("low translation confidence forces verdict UNKNOWN", () => {
    expect(() =>
      buildReport({ ...baseValid, translationConfidence: { band: "low", score: 0.2 } }),
    ).toThrow();
  });

  it("requires a non-empty honesty contract", () => {
    expect(() => buildReport({ ...baseValid, honestyContract: "" })).toThrow();
  });
});

describe("honest defaults", () => {
  it("serializes a clean SAT as noContradictionFound (never 'proven consistent')", () => {
    const r = buildReport(baseValid);
    expect(r.consistency.noContradictionFound).toBe(true);
    expect(JSON.stringify(r)).not.toMatch(/proven consistent/i);
  });

  it("attaches the ref-99 honesty contract by default", () => {
    expect(buildReport(baseValid).honestyContract).toBe(HONESTY_CONTRACT);
  });

  it("sets verdict confidence high when a certificate is present", () => {
    expect(buildReport(baseValid).verdictConfidence.band).toBe("high");
  });
});

describe("toMarkdown", () => {
  it("shows the three independent fields", () => {
    const md = toMarkdown(buildReport(baseValid));
    expect(md).toMatch(/Symbol dictionary/);
    expect(md).toMatch(/Formalization/);
    expect(md).toMatch(/Validity \(≠ truth\)/);
    expect(md).toMatch(/Consistency/);
    expect(md).toMatch(/noContradictionFound/);
  });
});

describe("logicReportSchema (direct)", () => {
  it("rejects a VALID object with empty dictionary on direct parse", () => {
    const r = buildReport(baseValid);
    expect(() => logicReportSchema.parse({ ...r, symbolDictionary: [] })).toThrow();
  });
});
