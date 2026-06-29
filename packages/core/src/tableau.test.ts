import { describe, expect, it } from "vitest";
import { not } from "./ast.js";
import { evaluate, isContradiction } from "./evaluate.js";
import { parse } from "./parser.js";
import { refute } from "./tableau.js";
import { randomBatch } from "./testkit.js";

describe("refute — basics", () => {
  it("closes on a literal and its negation", () => {
    const r = refute([parse("a"), parse("~a")]);
    expect(r.closed).toBe(true);
  });

  it("closes on the negation of a tautology (a → a)", () => {
    const r = refute([not(parse("a -> a"))]);
    expect(r.closed).toBe(true);
  });

  it("stays open for a satisfiable set and returns a satisfying model", () => {
    const r = refute([parse("a | b")]);
    expect(r.closed).toBe(false);
    if (!r.closed) expect(evaluate(parse("a | b"), r.model)).toBe(true);
  });

  it("marks every leaf closedBy in a fully closed tableau", () => {
    // (a ∨ b), ¬a, ¬b — both branches of the ∨ close
    const r = refute([parse("a | b"), parse("~a"), parse("~b")]);
    expect(r.closed).toBe(true);
    if (r.closed) {
      const leafIds = new Set(r.tree.edges.map((e) => e.to));
      for (const e of r.tree.edges) leafIds.delete(e.from);
      // every leaf node carries a closedBy marker
      for (const id of leafIds) {
        const node = r.tree.nodes.find((n) => n.id === id)!;
        expect(node.closedBy, `leaf ${id} (${node.label}) should be closed`).toBeTypeOf(
          "number",
        );
      }
    }
  });
});

describe("tableau ≡ truth-table oracle (property)", () => {
  it("refute([f]).closed === isContradiction(f), open models satisfy f", () => {
    const batch = randomBatch(0x7ab1ea, 400, 4);
    for (const f of batch) {
      const r = refute([f]);
      expect(r.closed).toBe(isContradiction(f));
      if (!r.closed) expect(evaluate(f, r.model)).toBe(true);
    }
  });
});
