import { describe, it, expect } from "vitest";
import {
  ESCALATION_TARGETS,
  LOGIC_FRAGMENTS,
  FLATTENED_KINDS,
  escalationTargetById,
  logicFragmentById,
  flattenedKindById,
  entriesFromRef,
  isOutOfNativeFragment,
  TAIL_REFS,
} from "./taxonomy.js";

const uniq = <T>(xs: readonly T[]) => new Set(xs).size === xs.length;

describe("taxonomy integrity", () => {
  it("ids are unique within each dimension", () => {
    expect(uniq(LOGIC_FRAGMENTS.map((f) => f.id))).toBe(true);
    expect(uniq(ESCALATION_TARGETS.map((t) => t.id))).toBe(true);
    expect(uniq(FLATTENED_KINDS.map((k) => k.id))).toBe(true);
  });

  it("lookups resolve every entry", () => {
    for (const f of LOGIC_FRAGMENTS) expect(logicFragmentById[f.id]).toBe(f);
    for (const t of ESCALATION_TARGETS) expect(escalationTargetById[t.id]).toBe(t);
    for (const k of FLATTENED_KINDS) expect(flattenedKindById[k.id]).toBe(k);
  });

  it("every fragment escalates to a real target or is flag-only (null)", () => {
    for (const f of LOGIC_FRAGMENTS) {
      if (f.escalateTo !== null) {
        expect(escalationTargetById[f.escalateTo]).toBeDefined();
      }
    }
  });

  it("exactly one fragment (PL) is native to the v0.1 core", () => {
    const native = LOGIC_FRAGMENTS.filter((f) => f.nativeInCore);
    expect(native.map((f) => f.id)).toEqual(["PL"]);
    expect(isOutOfNativeFragment("PL")).toBe(false);
    expect(isOutOfNativeFragment("FOL")).toBe(true);
  });
});

describe("deferred tail — references 21 & 22 are wired in", () => {
  it("ref 21 (formal semantics / controlled NL) contributes its entries", () => {
    const e = entriesFromRef("21");
    expect(e.fragments.map((f) => f.id)).toContain("GENERALIZED_QUANTIFIER");
    expect(e.flattenedKinds.map((k) => k.id).sort()).toEqual([
      "ambiguous-reading",
      "generalized-quantifier",
    ]);
  });

  it("ref 22 (type theory / Curry–Howard) contributes fragments + the proof-assistant escalator", () => {
    const e = entriesFromRef("22");
    expect(e.fragments.map((f) => f.id).sort()).toEqual(["DEPENDENT_TYPE_THEORY", "HOL"]);
    expect(e.escalations.map((t) => t.id)).toEqual(["PROOF_ASSISTANT"]);
    expect(e.flattenedKinds.map((k) => k.id)).toEqual(["higher-order"]);
  });

  it("HOL and dependent type theory escalate to a proof assistant, not a guess", () => {
    expect(logicFragmentById.HOL.escalateTo).toBe("PROOF_ASSISTANT");
    expect(logicFragmentById.DEPENDENT_TYPE_THEORY.escalateTo).toBe("PROOF_ASSISTANT");
    expect(escalationTargetById.PROOF_ASSISTANT.tools).toContain("Lean 4");
  });

  it("the tail introduces no entry attributed to a non-tail ref by mistake", () => {
    const tailFlattened = FLATTENED_KINDS.filter((k) =>
      (TAIL_REFS as readonly string[]).includes(k.ref),
    );
    expect(tailFlattened.map((k) => k.id).sort()).toEqual([
      "ambiguous-reading",
      "generalized-quantifier",
      "higher-order",
    ]);
  });
});
