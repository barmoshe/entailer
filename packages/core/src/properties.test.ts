/**
 * The consolidated cross-engine + discipline guarantees (BUILD_PLAN T12).
 *
 * Deterministic: a seeded generator makes every run identical. These are the
 * properties that license trusting the engine at all — a wrong VALID is worse
 * than no tool.
 */
import { describe, expect, it } from "vitest";
import { atom, implies, not, type Formula } from "./ast.js";
import { dpllSat } from "./dpll.js";
import { evaluate, firstCounterModel, isContradiction, isSat } from "./evaluate.js";
import { refute } from "./tableau.js";
import { checkValidity } from "./verify/index.js";
import { evaluateSentence } from "./adapters/sentence.js";
import { makeRng, randomBatch, randomFormula } from "./testkit.js";

const ATOMS = ["a", "b", "c", "d"] as const;

describe("property 1 — soundness (VALID carries a proof and the oracle agrees)", () => {
  it("holds across random (premises ⊢ conclusion) instances", () => {
    const rng = makeRng(0x501);
    for (let i = 0; i < 400; i++) {
      const premises = [randomFormula(rng, 3, ATOMS), randomFormula(rng, 3, ATOMS)];
      const conclusion = randomFormula(rng, 3, ATOMS);
      const r = checkValidity(premises, conclusion);
      // oracle truth: no counter-model means valid
      const oracleValid = firstCounterModel(premises, conclusion) === null;
      if (r.verdict === "VALID") {
        expect(r.proof, "VALID must carry a proof").toBeDefined();
        expect(oracleValid, "oracle must agree it is valid").toBe(true);
      } else if (r.verdict === "INVALID") {
        expect(oracleValid).toBe(false);
      }
    }
  });
});

describe("property 2 — tableau ≡ DPLL ≡ truth-table oracle", () => {
  it("all three agree on satisfiability for a shared random batch", () => {
    const batch = randomBatch(0x7e57, 500, 5, ATOMS);
    for (const f of batch) {
      const oracleSat = isSat(f);
      const dpll = dpllSat(f);
      const tableauClosed = refute([f]).closed; // closed ⇒ unsat
      expect(dpll.sat).toBe(oracleSat);
      expect(!tableauClosed).toBe(oracleSat);
      if (dpll.sat) expect(evaluate(f, dpll.model)).toBe(true);
    }
  });
});

describe("property 3 — explosion guard", () => {
  it("an inconsistent premise set never yields an unflagged VALID", () => {
    const rng = makeRng(0xb00b5);
    for (let i = 0; i < 200; i++) {
      const a = randomFormula(rng, 2, ATOMS);
      const premises: Formula[] = [a, not(a)]; // guaranteed inconsistent
      const conclusion = randomFormula(rng, 2, ATOMS);
      const r = checkValidity(premises, conclusion);
      // It will be VALID (ex falso), but MUST be flagged vacuous.
      if (r.verdict === "VALID") expect(r.vacuous).toBe(true);
    }
  });
});

describe("property 4 — vacuity flag", () => {
  it("an unsatisfiable antecedent is flagged vacuous, not silently VALID", () => {
    // (a ∧ ¬a) → b is a tautology, but vacuously so.
    const r = evaluateSentence("(a & ~a) -> b");
    expect(r.verdict).toBe("VALID");
    expect(r.validity.vacuous).toBe(true);
  });

  it("a non-vacuous tautology is not flagged", () => {
    const r = evaluateSentence("a | ~a");
    expect(r.verdict).toBe("VALID");
    expect(r.validity.vacuous).toBeUndefined();
  });
});

describe("property 5 — no INVALID without a counter-model", () => {
  it("every INVALID validity result carries a counter-model that the oracle confirms", () => {
    const rng = makeRng(0x1234);
    for (let i = 0; i < 400; i++) {
      const premises = [randomFormula(rng, 3, ATOMS)];
      const conclusion = randomFormula(rng, 3, ATOMS);
      const r = checkValidity(premises, conclusion);
      if (r.verdict === "INVALID") {
        expect(r.counterModel, "INVALID must carry a counter-model").toBeDefined();
        const cm = r.counterModel!;
        // the witness must satisfy all premises and falsify the conclusion
        expect(premises.every((p) => evaluate(p, cm))).toBe(true);
        expect(evaluate(conclusion, cm)).toBe(false);
      }
    }
  });
});

describe("sanity — the canonical shapes", () => {
  it("modus ponens is VALID, affirming the consequent is INVALID", () => {
    expect(checkValidity([atom("p"), implies(atom("p"), atom("q"))], atom("q")).verdict).toBe(
      "VALID",
    );
    expect(checkValidity([implies(atom("p"), atom("q")), atom("q")], atom("p")).verdict).toBe(
      "INVALID",
    );
  });
});
