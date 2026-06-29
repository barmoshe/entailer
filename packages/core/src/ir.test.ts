import { describe, expect, it } from "vitest";
import { atom, implies } from "./ast.js";
import {
  formalizedArgumentSchema,
  parseFormalizedArgument,
  type FormalizedArgument,
} from "./ir.js";

const validIR: FormalizedArgument = {
  logic: "PROP",
  symbols: [
    { kind: "atom", name: "p", arity: 0, gloss: "it is raining", source: "stated", spans: [] },
    { kind: "atom", name: "q", arity: 0, gloss: "the ground is wet", source: "stated", spans: [] },
  ],
  premises: [
    { ast: atom("p"), role: "premise", source: "stated", spans: [] },
    { ast: implies(atom("p"), atom("q")), role: "premise", source: "stated", spans: [] },
  ],
  conclusion: { ast: atom("q"), source: "stated", spans: [] },
  outOfScope: [],
  translationConfidence: { band: "high", score: 0.95, signals: ["round-trip-stable"] },
};

describe("formalizedArgumentSchema", () => {
  it("accepts a well-formed argument", () => {
    expect(() => parseFormalizedArgument(validIR)).not.toThrow();
  });

  it("rejects an empty symbol dictionary", () => {
    expect(() => parseFormalizedArgument({ ...validIR, symbols: [] })).toThrow();
  });

  it("rejects a bad premise role", () => {
    const bad = {
      ...validIR,
      premises: [{ ast: atom("p"), role: "axiom", source: "stated", spans: [] }],
    };
    expect(() => parseFormalizedArgument(bad)).toThrow();
  });

  it("rejects a malformed reading: source", () => {
    const bad = { ...validIR, premises: [{ ...validIR.premises[0]!, source: "reading:" }] };
    expect(() => parseFormalizedArgument(bad)).toThrow();
  });

  it("accepts a reading:<id> source", () => {
    const ok = {
      ...validIR,
      premises: [{ ...validIR.premises[0]!, source: "reading:wide-scope" }],
    };
    expect(() => parseFormalizedArgument(ok)).not.toThrow();
  });

  it("validates the recursive Formula AST inside premises", () => {
    const bad = {
      ...validIR,
      premises: [{ ast: { type: "wat" }, role: "premise", source: "stated", spans: [] }],
    };
    expect(() => formalizedArgumentSchema.parse(bad)).toThrow();
  });
});
