import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { evaluateArgument } from "./adapters/argument.js";
import { parseFormalizedArgument } from "./ir.js";
import { logicReportSchema } from "./report.js";

const fixturesDir = resolve(dirname(fileURLToPath(import.meta.url)), "..", "fixtures");
const load = (name: string): unknown =>
  JSON.parse(readFileSync(resolve(fixturesDir, name), "utf8"));

function evalFixture(stem: string) {
  const ir = parseFormalizedArgument(load(`${stem}.ir.json`));
  const report = evaluateArgument(ir);
  // every produced report must itself pass the honesty schema
  expect(() => logicReportSchema.parse(report)).not.toThrow();
  return report;
}

describe("A — valid modus ponens (p, p→q ⊢ q)", () => {
  const report = evalFixture("a-modus-ponens");
  const expected = load("a-modus-ponens.expected.json") as Record<string, unknown>;

  it("is VALID with a proof", () => {
    expect(report.verdict).toBe(expected.verdict);
    expect(report.validity.status).toBe("VALID");
    expect(report.validity.proof).toBeDefined();
  });
  it("reproduces the certified symbol dictionary", () => {
    expect(report.symbolDictionary).toEqual(expected.symbolDictionary);
  });
});

describe("B — affirming the consequent (p→q, q ⊢ p)", () => {
  const report = evalFixture("b-affirming-consequent");
  const expected = load("b-affirming-consequent.expected.json") as Record<string, unknown>;

  it("is INVALID with the certified counter-model", () => {
    expect(report.verdict).toBe("INVALID");
    expect(report.validity.counterModel).toEqual({ p: false, q: true });
    expect((expected.validity as Record<string, unknown>).counterModel).toEqual({
      p: false,
      q: true,
    });
  });
  it("stays consistent on the premise set", () => {
    expect(report.consistency.status).toBe("SAT");
  });
});

describe("C — inconsistent spec (R1, R2, R3)", () => {
  const report = evalFixture("c-inconsistent-spec");
  const expected = load("c-inconsistent-spec.expected.json") as Record<string, unknown>;

  it("is INCONSISTENT with the exact minimal conflicting subset", () => {
    expect(report.verdict).toBe("INCONSISTENT");
    expect(report.consistency.status).toBe("UNSAT");
    expect(report.consistency.minimalConflictingSubset).toEqual([0, 1, 2]);
    expect((expected.consistency as Record<string, unknown>).minimalConflictingSubset).toEqual([
      0, 1, 2,
    ]);
  });
});
