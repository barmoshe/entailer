import { describe, expect, it } from "vitest";
import {
  evaluateArgument,
  evaluateMarkdown,
  evaluateSentence,
  parse,
  refute,
  not,
  type FormalizedArgument,
} from "@entailer/core";
import {
  claimGraphToMermaid,
  claimGraphView,
  counterModelToText,
  tableauToMermaid,
  tableauToText,
  truthTableToSvg,
  truthTableToText,
  truthTableView,
  verdictBadge,
} from "./index.js";

describe("truthTableView", () => {
  it("enumerates 2^n rows and marks falsifying rows", () => {
    const view = truthTableView(parse("a -> b"));
    expect(view.vars).toEqual(["a", "b"]);
    expect(view.rows).toHaveLength(4);
    const falsifying = view.rows.filter((r) => !r.value);
    expect(falsifying).toHaveLength(1); // a=T, b=F
    expect(falsifying[0]!.assignment).toEqual({ a: true, b: false });
  });

  it("renders text and valid SVG", () => {
    const view = truthTableView(parse("a | ~a"));
    const text = truthTableToText(view);
    expect(text).toMatch(/a \| \(a ∨ ¬a\)/);
    const svg = truthTableToSvg(view);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain("</svg>");
  });
});

describe("tableau renderers", () => {
  it("renders a closed proof tree to mermaid + text with closure markers", () => {
    const r = refute([parse("a | b"), parse("~a"), parse("~b")]);
    expect(r.closed).toBe(true);
    if (r.closed) {
      const mermaid = tableauToMermaid(r.tree);
      expect(mermaid.startsWith("graph TD")).toBe(true);
      expect(mermaid).toContain("classDef closed");
      expect(tableauToText(r.tree)).toMatch(/✕ closed/);
    }
  });
});

describe("verdictBadge — certificate gating", () => {
  it("valid only with a proof, invalid only with a counter-model", () => {
    const valid = evaluateSentence("a | ~a");
    expect(verdictBadge(valid)).toBe("valid");

    const mp: FormalizedArgument = {
      logic: "PROP",
      symbols: [
        { kind: "atom", name: "p", arity: 0, gloss: "p", source: "stated", spans: [] },
        { kind: "atom", name: "q", arity: 0, gloss: "q", source: "stated", spans: [] },
      ],
      premises: [
        { ast: parse("p -> q"), role: "premise", source: "stated", spans: [] },
        { ast: parse("q"), role: "premise", source: "stated", spans: [] },
      ],
      conclusion: { ast: parse("p"), source: "stated", spans: [] },
      outOfScope: [],
      translationConfidence: { band: "high", score: 0.9, signals: [] },
    };
    const invalid = evaluateArgument(mp);
    expect(verdictBadge(invalid)).toBe("invalid");
    expect(invalid.validity.counterModel).toBeDefined();
    expect(counterModelToText(invalid.validity.counterModel!)).toContain("p=F");
  });

  it("a contingent sentence (no certificate) is inconclusive, not colored", () => {
    expect(verdictBadge(evaluateSentence("a -> b"))).toBe("inconclusive");
  });
});

describe("claimGraphView (Tier 3)", () => {
  it("flags the minimal conflicting subset", () => {
    const md =
      "```entailer\nlet req=r\nlet logged=l\nlet health=h\nreq -> logged\nhealth -> ~logged\nhealth & req\n```";
    const report = evaluateMarkdown({ markdown: md, uri: "policy.md" });
    const view = claimGraphView(report);
    expect(view.nodes.filter((n) => n.inConflict).length).toBe(3);
    const mermaid = claimGraphToMermaid(view);
    expect(mermaid.startsWith("graph LR")).toBe(true);
    expect(mermaid).toContain("classDef conflict");
  });
});

describe("import sanity", () => {
  it("not() is re-usable for a closed-tableau demo", () => {
    expect(refute([not(parse("a -> a"))]).closed).toBe(true);
  });
});
