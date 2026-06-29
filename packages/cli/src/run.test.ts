import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { exitCodeFor, run } from "./run.js";

const here = dirname(fileURLToPath(import.meta.url));
const coreFixtures = resolve(here, "..", "..", "core", "fixtures");
const fix = (name: string): string => resolve(coreFixtures, name);

describe("exitCodeFor", () => {
  it("maps verdicts to honest exit codes", () => {
    expect(exitCodeFor("VALID")).toBe(0);
    expect(exitCodeFor("NO_ISSUE_FOUND")).toBe(0);
    expect(exitCodeFor("INVALID")).toBe(1);
    expect(exitCodeFor("INCONSISTENT")).toBe(1);
    expect(exitCodeFor("UNKNOWN")).toBe(3);
  });
});

describe("sentence command", () => {
  it("a contradiction exits non-zero and prints a contradiction report", () => {
    const r = run(["sentence", "a & ~a"]);
    expect(r.code).toBe(1);
    expect(r.stdout).toMatch(/INCONSISTENT/);
  });

  it("a tautology exits 0", () => {
    expect(run(["sentence", "a | ~a"]).code).toBe(0);
  });

  it("--json emits a schema-valid LogicReport", () => {
    const r = run(["sentence", "a -> b", "--json"]);
    expect(r.code).toBe(0);
    const report = JSON.parse(r.stdout);
    expect(report.verdict).toBe("NO_ISSUE_FOUND");
    expect(report.honestyContract).toBeTruthy();
    expect(report.symbolDictionary.length).toBeGreaterThan(0);
  });

  it("malformed DSL exits 2", () => {
    expect(run(["sentence", "a &"]).code).toBe(2);
  });
});

describe("check command on the A/B/C golden fixtures", () => {
  it("A (modus ponens) ⇒ VALID, exit 0", () => {
    const r = run(["check", "--ir", fix("a-modus-ponens.ir.json"), "--json"]);
    expect(r.code).toBe(0);
    expect(JSON.parse(r.stdout).verdict).toBe("VALID");
  });

  it("B (affirming the consequent) ⇒ INVALID + counter-model, exit 1", () => {
    const r = run(["check", "--ir", fix("b-affirming-consequent.ir.json"), "--json"]);
    expect(r.code).toBe(1);
    expect(JSON.parse(r.stdout).validity.counterModel).toEqual({ p: false, q: true });
  });

  it("C (inconsistent spec) ⇒ INCONSISTENT + minimal subset, exit 1", () => {
    const r = run(["check", "--ir", fix("c-inconsistent-spec.ir.json"), "--json"]);
    expect(r.code).toBe(1);
    expect(JSON.parse(r.stdout).consistency.minimalConflictingSubset).toEqual([0, 1, 2]);
  });
});

describe("help and errors", () => {
  it("prints usage with no args", () => {
    expect(run([]).stdout).toMatch(/Usage:/);
  });
  it("unknown command exits 2", () => {
    expect(run(["frobnicate"]).code).toBe(2);
  });
});
