import { describe, expect, it } from "vitest";
import {
  TranslationError,
  translate,
  translateAndEvaluate,
  type Formalizer,
  type RawFormalization,
} from "./index.js";

/** A fake formalizer — no network, no API key. */
const fake = (raw: RawFormalization): Formalizer => async () => raw;

describe("translate — happy path", () => {
  it("builds a validated FormalizedArgument from a flat formalization", async () => {
    const ir = await translate("if the deploy succeeded the release is live; it did; so it's live", {
      formalize: fake({
        logic: "PROP",
        symbols: [
          { name: "p", gloss: "the deploy succeeded" },
          { name: "q", gloss: "the release is live" },
        ],
        premises: [
          { dsl: "p -> q", role: "premise" },
          { dsl: "p", role: "premise" },
        ],
        conclusion: { dsl: "q" },
        outOfScope: [],
        confidence: { band: "high", score: 0.95, signals: ["round-trip-stable"] },
      }),
    });
    expect(ir.logic).toBe("PROP");
    expect(ir.symbols).toHaveLength(2);
    expect(ir.premises).toHaveLength(2);
    expect(ir.conclusion?.ast).toEqual({ type: "atom", name: "q" });
    expect(ir.translationConfidence.band).toBe("high");
  });
});

describe("translate — deterministic confidence guard", () => {
  it("downgrades to low (and forces UNKNOWN downstream) on an undeclared atom", async () => {
    const report = await translateAndEvaluate("nonsense", {
      formalize: fake({
        logic: "PROP",
        symbols: [{ name: "p", gloss: "p holds" }],
        premises: [{ dsl: "p -> r", role: "premise" }], // r is undeclared
        conclusion: null,
        outOfScope: [],
        confidence: { band: "high", score: 0.9, signals: [] },
      }),
    });
    expect(report.verdict).toBe("UNKNOWN");
    expect(report.translationConfidence?.band).toBe("low");
  });

  it("drops an unparseable premise and degrades confidence", async () => {
    const ir = await translate("x", {
      formalize: fake({
        logic: "PROP",
        symbols: [
          { name: "p", gloss: "p" },
          { name: "q", gloss: "q" },
        ],
        premises: [
          { dsl: "p & q", role: "premise" },
          { dsl: "p &", role: "premise" }, // malformed
        ],
        conclusion: null,
        outOfScope: [],
        confidence: { band: "high", score: 0.9, signals: [] },
      }),
    });
    expect(ir.premises).toHaveLength(1);
    expect(ir.translationConfidence.band).toBe("low");
    expect(ir.translationConfidence.signals.some((s) => s.startsWith("parse-error:"))).toBe(true);
  });
});

describe("translateAndEvaluate — full pipeline", () => {
  it("catches an invalid argument with a counter-model", async () => {
    const report = await translateAndEvaluate("if p then q; q; so p", {
      formalize: fake({
        logic: "PROP",
        symbols: [
          { name: "p", gloss: "p" },
          { name: "q", gloss: "q" },
        ],
        premises: [
          { dsl: "p -> q", role: "premise" },
          { dsl: "q", role: "premise" },
        ],
        conclusion: { dsl: "p" },
        outOfScope: [],
        confidence: { band: "high", score: 0.9, signals: [] },
      }),
    });
    expect(report.verdict).toBe("INVALID");
    expect(report.validity.counterModel).toEqual({ p: false, q: true });
  });

  it("flags out-of-scope modal content without forcing it", async () => {
    const ir = await translate("the system must stay up", {
      formalize: fake({
        logic: "PROP",
        symbols: [{ name: "up", gloss: "the system is up" }],
        premises: [{ dsl: "up", role: "premise" }],
        conclusion: null,
        outOfScope: [{ text: "must stay up", kind: "deontic" }],
        confidence: { band: "med", score: 0.6, signals: [] },
      }),
    });
    expect(ir.outOfScope).toContainEqual({ text: "must stay up", kind: "deontic", spans: [] });
  });
});

describe("translate — hard failures", () => {
  it("throws TranslationError when nothing parses", async () => {
    await expect(
      translate("x", {
        formalize: fake({
          logic: "PROP",
          symbols: [{ name: "p", gloss: "p" }],
          premises: [{ dsl: "&&&", role: "premise" }],
          conclusion: null,
          outOfScope: [],
          confidence: { band: "high", score: 0.9, signals: [] },
        }),
      }),
    ).rejects.toBeInstanceOf(TranslationError);
  });
});
