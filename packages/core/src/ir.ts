/**
 * The typed intermediate representation (DESIGN §4.3).
 *
 * The translator (LLM or rule-based) emits this; the deterministic core consumes
 * it. One schema unifies the argument layer and the cross-file ClaimSet layer.
 * The symbol dictionary is first-class and non-empty by construction — a verdict
 * without it cannot be assembled.
 */
import { z } from "zod";
import type { Formula, Term } from "./ast.js";

// ---- Formula / Term schemas (recursive) -----------------------------------

const termSchema: z.ZodType<Term> = z.lazy(() =>
  z.discriminatedUnion("type", [
    z.object({ type: z.literal("var"), name: z.string() }),
    z.object({ type: z.literal("func"), name: z.string(), args: z.array(termSchema) }),
  ]),
);

export const formulaSchema: z.ZodType<Formula> = z.lazy(() =>
  z.discriminatedUnion("type", [
    z.object({ type: z.literal("atom"), name: z.string() }),
    z.object({ type: z.literal("pred"), name: z.string(), args: z.array(termSchema) }),
    z.object({ type: z.literal("not"), sub: formulaSchema }),
    z.object({ type: z.literal("and"), left: formulaSchema, right: formulaSchema }),
    z.object({ type: z.literal("or"), left: formulaSchema, right: formulaSchema }),
    z.object({ type: z.literal("implies"), left: formulaSchema, right: formulaSchema }),
    z.object({ type: z.literal("iff"), left: formulaSchema, right: formulaSchema }),
    z.object({ type: z.literal("bottom") }),
    z.object({ type: z.literal("top") }),
    z.object({ type: z.literal("forall"), variable: z.string(), sub: formulaSchema }),
    z.object({ type: z.literal("exists"), variable: z.string(), sub: formulaSchema }),
  ]),
);

// ---- IR records -----------------------------------------------------------

export const logicSchema = z.enum(["PROP", "FOL"]);
export type Logic = z.infer<typeof logicSchema>;

/** 'stated' | 'supplied' | `reading:<id>` — provenance of a claim. */
export const sourceSchema = z.union([
  z.literal("stated"),
  z.literal("supplied"),
  z.string().regex(/^reading:.+/, "reading source must be `reading:<id>`"),
]);
export type Source = z.infer<typeof sourceSchema>;

export const sourceSpanSchema = z.object({
  uri: z.string().optional(),
  startLine: z.number().int().nonnegative().optional(),
  endLine: z.number().int().nonnegative().optional(),
  text: z.string().optional(),
});
export type SourceSpan = z.infer<typeof sourceSpanSchema>;

export const symbolEntrySchema = z.object({
  kind: z.enum(["atom", "pred", "const", "func"]),
  name: z.string().min(1),
  arity: z.number().int().nonnegative(),
  /** Exact English — the trust anchor (ref 06 prime directive). */
  gloss: z.string().min(1),
  source: sourceSchema,
  spans: z.array(sourceSpanSchema),
});
export type SymbolEntry = z.infer<typeof symbolEntrySchema>;

export const flattenedKindSchema = z.enum([
  "modal",
  "deontic",
  "temporal",
  "probabilistic",
  "causal",
  "vague",
  "higher-order",
  "generalized-quantifier",
  "ambiguous-reading",
]);
export type FlattenedKindId = z.infer<typeof flattenedKindSchema>;

export const premiseSchema = z.object({
  ast: formulaSchema,
  role: z.enum(["premise", "premise-supplied"]),
  source: sourceSchema,
  spans: z.array(sourceSpanSchema),
});

export const conclusionSchema = z.object({
  ast: formulaSchema,
  source: sourceSchema,
  spans: z.array(sourceSpanSchema),
  inferred: z.boolean().optional(),
});

export const translationConfidenceSchema = z.object({
  band: z.enum(["low", "med", "high"]),
  score: z.number().min(0).max(1),
  signals: z.array(z.string()),
});
export type TranslationConfidence = z.infer<typeof translationConfidenceSchema>;

const outOfScopeSchema = z.object({
  text: z.string(),
  kind: flattenedKindSchema,
  spans: z.array(sourceSpanSchema),
});

/** The argument fields shared by a top-level argument and a per-reading variant. */
const baseArgumentShape = {
  logic: logicSchema,
  symbols: z.array(symbolEntrySchema).min(1, "the symbol dictionary must be non-empty"),
  premises: z.array(premiseSchema),
  conclusion: conclusionSchema.optional(),
  outOfScope: z.array(outOfScopeSchema).default([]),
  translationConfidence: translationConfidenceSchema,
} as const;

/** A single reading (no nested ambiguity) — used inside `ambiguity.readings`. */
export const argumentReadingSchema = z.object(baseArgumentShape);

/**
 * A formalized argument. `symbols` is required non-empty: the verifier never runs
 * over a formalization with no visible dictionary. Ambiguous prose surfaces every
 * competing reading rather than picking one silently.
 */
export const formalizedArgumentSchema = z.object({
  ...baseArgumentShape,
  ambiguity: z
    .object({
      readings: z.array(argumentReadingSchema),
      divergesOnVerdict: z.boolean(),
    })
    .optional(),
});
export type FormalizedArgument = z.infer<typeof formalizedArgumentSchema>;

export const claimSetSchema = z.object({
  args: z.array(formalizedArgumentSchema),
  scopes: z.array(z.object({ id: z.string(), argIds: z.array(z.string()) })),
  unification: z
    .array(
      z.object({
        a: z.string(),
        b: z.string(),
        basis: z.string(),
        source: z.enum(["user", "llm", "lexical"]),
        confidence: z.number().min(0).max(1),
      }),
    )
    .optional(),
});
export type ClaimSet = z.infer<typeof claimSetSchema>;

/** Parse + validate an untrusted IR object, throwing on any violation. */
export function parseFormalizedArgument(input: unknown): FormalizedArgument {
  return formalizedArgumentSchema.parse(input);
}
