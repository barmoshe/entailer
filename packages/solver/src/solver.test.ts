import { describe, expect, it } from "vitest";
import { forall, parse, pred, v } from "@entailer/core";
import {
  OutOfFragmentError,
  checkConsistencySmt,
  checkValiditySmt,
  emitSmtLib,
  isAvailable,
  toSmtTerm,
} from "./index.js";

describe("toSmtTerm", () => {
  it("maps connectives to SMT-LIB", () => {
    expect(toSmtTerm(parse("a -> b"))).toBe("(=> a b)");
    expect(toSmtTerm(parse("~a & b"))).toBe("(and (not a) b)");
    expect(toSmtTerm(parse("a <-> b"))).toBe("(= a b)");
    expect(toSmtTerm(parse("true"))).toBe("true");
  });
  it("quotes non-identifier ground-predicate keys", () => {
    expect(toSmtTerm(pred("P", [{ type: "func", name: "a", args: [] }]))).toBe("|P(a)|");
  });
});

describe("emitSmtLib", () => {
  it("emits a refutation script with declared Bools and ¬conclusion", () => {
    const script = emitSmtLib({
      premises: [parse("p -> q"), parse("p")],
      conclusion: parse("q"),
    });
    expect(script).toContain("(set-logic QF_UF)");
    expect(script).toContain("(declare-const p Bool)");
    expect(script).toContain("(declare-const q Bool)");
    expect(script).toContain("(assert (=> p q))");
    expect(script).toContain("(assert (not q))");
    expect(script.trimEnd().endsWith("(check-sat)")).toBe(true);
  });

  it("emits a consistency script when no conclusion is given", () => {
    const script = emitSmtLib({ premises: [parse("a"), parse("~a")] });
    expect(script).toContain("(assert a)");
    expect(script).toContain("(assert (not a))");
    expect(script).not.toContain("(not (");
  });

  it("rejects quantified input", () => {
    expect(() => emitSmtLib({ premises: [forall("x", pred("P", [v("x")]))] })).toThrowError(
      OutOfFragmentError,
    );
  });
});

describe("Z3 escalation (works when z3-solver is present, degrades when not)", () => {
  it("checkValiditySmt: modus ponens ⇒ VALID, affirming-consequent ⇒ INVALID (or UNKNOWN if absent)", async () => {
    const available = await isAvailable();
    const mp = await checkValiditySmt([parse("p -> q"), parse("p")], parse("q"));
    const ac = await checkValiditySmt([parse("p -> q"), parse("q")], parse("p"));
    // the emitted script is always attached, available or not
    expect(mp.smtlib).toContain("(check-sat)");
    if (available) {
      expect(mp.verdict).toBe("VALID");
      expect(mp.raw).toBe("unsat");
      expect(ac.verdict).toBe("INVALID");
      expect(ac.raw).toBe("sat");
    } else {
      expect(mp.verdict).toBe("UNKNOWN");
      expect(mp.method).toBe("smt-unavailable");
    }
  });

  it("checkConsistencySmt: {a, ¬a} ⇒ UNSAT, {a→b, a} ⇒ SAT (or UNKNOWN if absent)", async () => {
    const available = await isAvailable();
    const bad = await checkConsistencySmt([parse("a"), parse("~a")]);
    const ok = await checkConsistencySmt([parse("a -> b"), parse("a")]);
    if (available) {
      expect(bad.status).toBe("UNSAT");
      expect(ok.status).toBe("SAT");
    } else {
      expect(bad.status).toBe("UNKNOWN");
      expect(bad.reason).toMatch(/not installed/);
    }
  });
});
