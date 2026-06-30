/**
 * @entailer/translate — the LLM seam (DESIGN §3, §6).
 *
 * The ONLY package that touches an LLM. It turns prose into a typed
 * `FormalizedArgument` IR that the deterministic core then verifies. To stay
 * compatible with structured outputs (which cannot express the recursive Formula
 * AST), the model emits a **flat** formalization — a symbol dictionary plus
 * logic-DSL strings — and the deterministic core **parser** builds the AST. So
 * even the AST construction is deterministic; the model only proposes glosses and
 * DSL.
 *
 * Translation faithfulness is the irreducible weak link (DESIGN §12 risk 2), so
 * the verdict is always conditional on the displayed formalization, and a
 * deterministic post-check (does every DSL parse? are all atoms declared?) can
 * force the confidence band to `low` — which makes the core return UNKNOWN rather
 * than a confident-but-wrong verdict.
 */
import { z } from "zod";
import {
  ParseError,
  evaluateArgument,
  parse,
  parseFormalizedArgument,
  isPropositional,
  atomsOf,
  type FormalizedArgument,
  type LogicReport,
} from "@entailer/core";

/** The flat, structured-output-friendly shape the model returns. */
export const rawFormalizationSchema = z.object({
  logic: z.enum(["PROP", "FOL"]),
  symbols: z
    .array(z.object({ name: z.string(), gloss: z.string() }))
    .describe("the symbol dictionary: each atom/predicate name and its exact English meaning"),
  premises: z
    .array(
      z.object({
        dsl: z.string().describe("the premise as a logic-DSL string, e.g. 'p -> q'"),
        role: z.enum(["premise", "premise-supplied"]),
      }),
    )
    .describe("the stated and supplied (enthymeme) premises"),
  conclusion: z
    .object({ dsl: z.string() })
    .nullable()
    .describe("the conclusion as a logic-DSL string, or null if the text only asserts a claim set"),
  outOfScope: z
    .array(
      z.object({
        text: z.string(),
        kind: z.enum([
          "modal",
          "deontic",
          "temporal",
          "probabilistic",
          "causal",
          "vague",
          "higher-order",
          "generalized-quantifier",
          "ambiguous-reading",
        ]),
      }),
    )
    .describe("content the binary verdict cannot represent (must/shall/likely/...) — flagged, never forced"),
  confidence: z.object({
    band: z.enum(["low", "med", "high"]),
    score: z.number(),
    signals: z.array(z.string()),
  }),
});
export type RawFormalization = z.infer<typeof rawFormalizationSchema>;

const SYSTEM_PROMPT = [
  "You are the formalization layer of Entailer, a logician's-pass linter.",
  "Translate the user's prose into a flat formalization the deterministic verifier can check.",
  "",
  "Rules:",
  "- Emit a symbol dictionary: one entry per atomic proposition, with its EXACT English meaning.",
  "- Write each premise and the conclusion as a logic-DSL string over those symbol names.",
  "  Operators: ~ (not), & (and), | (or), -> (implies), <-> (iff). Atoms are [A-Za-z][A-Za-z0-9_]*.",
  "- Recover an implicit conclusion only when the prose argues toward one (indicator words: therefore, thus, so).",
  "  Mark a premise the reader had to supply (an enthymeme) with role 'premise-supplied'.",
  "- Do NOT force modal/deontic/temporal/probabilistic/causal/vague content into the logic. List it under outOfScope instead.",
  "- validity is not truth: formalize the STRUCTURE of the argument, not whether the premises are true.",
  "- Set confidence honestly: 'low' if the prose is ambiguous or you had to guess the logical form.",
].join("\n");

/** A pluggable formalizer — swap a fake in for offline tests. */
export type Formalizer = (text: string, context?: string) => Promise<RawFormalization>;

/**
 * The minimal client surface the default formalizer needs. Kept structural (not
 * imported from `@anthropic-ai/sdk`) so this package compiles and tests run
 * regardless of which SDK version — if any — is installed; the SDK is an optional
 * peer used only at runtime by the default formalizer.
 */
export interface LlmClient {
  messages: {
    create(args: {
      model: string;
      max_tokens: number;
      system?: string;
      messages: { role: "user" | "assistant"; content: string }[];
    }): Promise<{ content: Array<{ type: string; text?: string }> }>;
  };
}

export interface TranslateOptions {
  /** Override the LLM call (used in tests). */
  readonly formalize?: Formalizer;
  /** A client (structural). Defaults to a new `@anthropic-ai/sdk` client. */
  readonly client?: LlmClient;
  /** Model id (defaults to claude-opus-4-8). */
  readonly model?: string;
  /** Extra context for the formalizer (e.g. a doc title or surrounding section). */
  readonly context?: string;
}

/** Raised when the model output cannot be turned into a usable IR at all. */
export class TranslationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TranslationError";
  }
}

/** Pull the first JSON object out of a model response (tolerates ```json fences). */
function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1]! : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new TranslationError("no JSON object found in the model response");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

/** Construct the default Anthropic client by dynamic import (optional dep). */
async function defaultClient(): Promise<LlmClient> {
  try {
    const mod: any = await import("@anthropic-ai/sdk");
    const Anthropic = mod.default ?? mod.Anthropic;
    return new Anthropic() as LlmClient;
  } catch {
    throw new TranslationError(
      "@anthropic-ai/sdk is not installed; pass `client` or `formalize` to translate()",
    );
  }
}

/**
 * The default formalizer. Uses the universal `messages.create` + a JSON
 * instruction (not the version-specific structured-output helpers), so it works
 * across SDK versions; the deterministic guard in {@link translate} catches any
 * malformed output.
 */
export function anthropicFormalizer(client: LlmClient, model: string): Formalizer {
  return async (text, context) => {
    const userText = context ? `Context: ${context}\n\nText to formalize:\n${text}` : text;
    const instruction =
      "Return ONLY a single JSON object matching this shape (no prose, no code fence):\n" +
      '{ "logic": "PROP"|"FOL", "symbols": [{"name","gloss"}], ' +
      '"premises": [{"dsl","role":"premise"|"premise-supplied"}], ' +
      '"conclusion": {"dsl"} | null, "outOfScope": [{"text","kind"}], ' +
      '"confidence": {"band":"low"|"med"|"high","score","signals":[]} }';
    const response = await client.messages.create({
      model,
      max_tokens: 16000,
      system: `${SYSTEM_PROMPT}\n\n${instruction}`,
      messages: [{ role: "user", content: userText }],
    });
    const raw = response.content
      .filter((b) => b.type === "text" && typeof b.text === "string")
      .map((b) => b.text as string)
      .join("");
    return rawFormalizationSchema.parse(extractJson(raw));
  };
}

/**
 * Translate prose into a validated `FormalizedArgument`. Parses every DSL string
 * with the deterministic core parser; a parse failure or an atom missing from the
 * dictionary forces the confidence band to `low` (→ UNKNOWN downstream).
 */
export async function translate(
  text: string,
  opts: TranslateOptions = {},
): Promise<FormalizedArgument> {
  const model = opts.model ?? "claude-opus-4-8";
  const formalize =
    opts.formalize ??
    anthropicFormalizer(opts.client ?? (await defaultClient()), model);

  const raw = await formalize(text, opts.context);
  const signals = [...raw.confidence.signals];
  let degrade = false;

  const declared = new Set(raw.symbols.map((s) => s.name));

  const parseDsl = (dsl: string): ReturnType<typeof parse> | null => {
    try {
      const ast = parse(dsl);
      for (const a of atomsOf(ast)) {
        if (!declared.has(a)) {
          signals.push(`undeclared-atom:${a}`);
          degrade = true;
        }
      }
      return ast;
    } catch (e) {
      if (e instanceof ParseError) {
        signals.push(`parse-error:${dsl} (${e.message})`);
        degrade = true;
        return null;
      }
      throw e;
    }
  };

  const premises = raw.premises
    .map((p) => {
      const ast = parseDsl(p.dsl);
      return ast
        ? {
            ast,
            role: p.role,
            source: (p.role === "premise-supplied" ? "supplied" : "stated") as
              | "supplied"
              | "stated",
            spans: [{ text: p.dsl }],
          }
        : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  if (raw.symbols.length === 0 || premises.length === 0) {
    throw new TranslationError("no usable symbols/premises after parsing the formalization");
  }

  const conclusionAst = raw.conclusion ? parseDsl(raw.conclusion.dsl) : null;

  // Determine logic from what actually parsed (propositional unless a quantifier shows up).
  const allProp =
    premises.every((p) => isPropositional(p.ast)) &&
    (conclusionAst ? isPropositional(conclusionAst) : true);

  const band = degrade ? "low" : raw.confidence.band;
  const score = degrade ? Math.min(raw.confidence.score, 0.3) : raw.confidence.score;

  const ir: FormalizedArgument = {
    logic: allProp ? "PROP" : "FOL",
    symbols: raw.symbols.map((s) => ({
      kind: "atom" as const,
      name: s.name,
      arity: 0,
      gloss: s.gloss,
      source: "stated" as const,
      spans: [],
    })),
    premises,
    ...(conclusionAst
      ? { conclusion: { ast: conclusionAst, source: "stated" as const, spans: raw.conclusion ? [{ text: raw.conclusion.dsl }] : [], inferred: true } }
      : {}),
    outOfScope: raw.outOfScope.map((o) => ({ text: o.text, kind: o.kind, spans: [] })),
    translationConfidence: { band, score, signals },
  };

  // Validate against the core schema (throws on any structural violation).
  return parseFormalizedArgument(ir);
}

/** Full pipeline: translate prose, then verify with the deterministic core. */
export async function translateAndEvaluate(
  text: string,
  opts: TranslateOptions = {},
): Promise<LogicReport> {
  const ir = await translate(text, opts);
  return evaluateArgument(ir, { tier: 2 });
}
