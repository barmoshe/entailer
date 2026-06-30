import { describe, expect, it } from "vitest";
import {
  runCheckConsistency,
  runCheckValidity,
  runClassify,
  runEvaluateArgument,
  runEvaluateMarkdown,
  runEvaluatePrompt,
  runEvaluateRepo,
  runEvaluateSentence,
} from "./tools.js";

describe("check_validity", () => {
  it("modus ponens ⇒ VALID", () => {
    const r = runCheckValidity({ premises: ["p", "p -> q"], conclusion: "q" });
    expect(r.structuredContent?.verdict).toBe("VALID");
    expect(r.isError).toBeUndefined();
  });
  it("affirming the consequent ⇒ INVALID with counter-model", () => {
    const r = runCheckValidity({ premises: ["p -> q", "q"], conclusion: "p" });
    expect(r.structuredContent?.verdict).toBe("INVALID");
    expect(r.structuredContent?.counterModel).toEqual({ p: false, q: true });
  });
  it("parse error ⇒ isError", () => {
    expect(runCheckValidity({ premises: ["p &"], conclusion: "q" }).isError).toBe(true);
  });
});

describe("check_consistency", () => {
  it("the inconsistent spec ⇒ UNSAT with the minimal subset", () => {
    const r = runCheckConsistency({
      formulas: ["req -> logged", "health -> ~logged", "health & req"],
    });
    expect(r.structuredContent?.status).toBe("UNSAT");
    expect(r.structuredContent?.minimalConflictingSubset).toEqual([0, 1, 2]);
  });
  it("a satisfiable set ⇒ SAT", () => {
    expect(runCheckConsistency({ formulas: ["a -> b", "a"] }).structuredContent?.status).toBe(
      "SAT",
    );
  });
});

describe("classify_formula", () => {
  it("classifies the three shapes", () => {
    expect(runClassify({ formula: "a | ~a" }).structuredContent?.kind).toBe("tautology");
    expect(runClassify({ formula: "a & ~a" }).structuredContent?.kind).toBe("contradiction");
    expect(runClassify({ formula: "a -> b" }).structuredContent?.kind).toBe("contingent");
  });
});

describe("evaluate_sentence", () => {
  it("returns a LogicReport with a verdict", () => {
    const r = runEvaluateSentence({ dsl: "a | ~a", symbols: [{ symbol: "a", gloss: "it is up" }] });
    expect(r.structuredContent?.verdict).toBe("VALID");
    const report = r.structuredContent?.report as { honestyContract?: string };
    expect(report.honestyContract).toBeTruthy();
  });
});

describe("evaluate_argument", () => {
  it("evaluates a supplied IR", () => {
    const ir = {
      logic: "PROP",
      symbols: [
        { kind: "atom", name: "p", arity: 0, gloss: "deploy ok", source: "stated", spans: [] },
        { kind: "atom", name: "q", arity: 0, gloss: "live", source: "stated", spans: [] },
      ],
      premises: [
        { ast: { type: "atom", name: "p" }, role: "premise", source: "stated", spans: [] },
        {
          ast: { type: "implies", left: { type: "atom", name: "p" }, right: { type: "atom", name: "q" } },
          role: "premise",
          source: "stated",
          spans: [],
        },
      ],
      conclusion: { ast: { type: "atom", name: "q" }, source: "stated", spans: [] },
      outOfScope: [],
      translationConfidence: { band: "high", score: 0.9, signals: [] },
    };
    const r = runEvaluateArgument({ ir });
    expect(r.structuredContent?.verdict).toBe("VALID");
  });

  it("rejects an IR with no symbol dictionary", () => {
    const r = runEvaluateArgument({ ir: { logic: "PROP", symbols: [], premises: [], translationConfidence: { band: "high", score: 1, signals: [] } } });
    expect(r.isError).toBe(true);
  });
});

describe("evaluate_prompt (Tier 2)", () => {
  it("recovers the conclusion and validates", () => {
    const r = runEvaluatePrompt({
      claims: [
        { dsl: "p", text: "it succeeded" },
        { dsl: "p -> q", text: "if it succeeded it's live" },
        { dsl: "q", text: "therefore it's live" },
      ],
      symbols: [
        { symbol: "p", gloss: "ok" },
        { symbol: "q", gloss: "live" },
      ],
    });
    expect(r.structuredContent?.verdict).toBe("VALID");
  });
});

describe("evaluate_markdown (Tier 3)", () => {
  it("flags a within-doc inconsistency", () => {
    const md =
      "```entailer\nlet req=r\nlet logged=l\nlet health=h\nreq -> logged\nhealth -> ~logged\nhealth & req\n```";
    const r = runEvaluateMarkdown({ markdown: md, uri: "policy.md" });
    expect(r.structuredContent?.verdict).toBe("INCONSISTENT");
  });
});

describe("evaluate_repo (Tier 4)", () => {
  it("catches a cross-file contradiction", () => {
    const r = runEvaluateRepo({
      files: [
        { uri: "README.md", content: "```entailer\nlet req=r\nlet logged=l\nreq -> logged\n```" },
        { uri: "SPEC.md", content: "```entailer\nlet health=h\nhealth -> ~logged\nhealth & req\n```" },
      ],
    });
    expect(r.structuredContent?.verdict).toBe("INCONSISTENT");
  });
});
