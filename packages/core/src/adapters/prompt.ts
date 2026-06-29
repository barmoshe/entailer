/**
 * Tier-2 prompt adapter (DESIGN §5 Tier-2 row).
 *
 * A prompt is prose carrying several claims and (usually) an implicit conclusion.
 * The v0.1/v0.2-deterministic slice takes the claims already formalized as
 * logic-DSL strings, plus their surface text, and does the *deterministic* parts
 * of the tier:
 *   - **conclusion recovery** by indicator words ("therefore", "so", "thus", …);
 *   - **enthymeme** handling — a claim flagged `supplied` enters as
 *     `premise-supplied`;
 *   - **argument validity** over the recovered premises ⊢ conclusion.
 *
 * What stays deferred to `@entailer/translate` (v0.2 LLM seam) is turning raw
 * prose into the claim list and nominating a conclusion when no indicator is
 * present. When no conclusion can be recovered, this adapter honestly degrades to
 * a within-prompt **consistency** check rather than guessing one.
 */
import type { FormalizedArgument, SymbolEntry } from "../ir.js";
import { parse } from "../parser.js";
import { evaluateArgument } from "./argument.js";
import type { LogicReport } from "../report.js";

/** Conclusion-indicator words (DESIGN §5 "indicator words → else LLM"). */
const CONCLUSION_INDICATORS = [
  "therefore",
  "thus",
  "hence",
  "consequently",
  "so ",
  "it follows that",
  "we conclude",
  "we can conclude",
  "ergo",
  "in conclusion",
] as const;

/**
 * The index of the claim whose surface text marks it as the conclusion, or -1.
 * Deterministic: matches a leading (or near-leading) indicator word only.
 */
export function recoverConclusionIndex(texts: readonly string[]): number {
  for (let i = 0; i < texts.length; i++) {
    const t = texts[i]!.trim().toLowerCase();
    for (const ind of CONCLUSION_INDICATORS) {
      if (t.startsWith(ind) || t.startsWith(`, ${ind}`) || t.includes(` ${ind.trim()} `)) {
        return i;
      }
    }
  }
  return -1;
}

export interface PromptClaimInput {
  /** The claim formalized as a logic-DSL string. */
  readonly dsl: string;
  /** The surface English, used for conclusion recovery + provenance. */
  readonly text?: string;
  /** An enthymeme the reader had to supply (enters as `premise-supplied`). */
  readonly supplied?: boolean;
  /** Optional source line. */
  readonly line?: number;
}

export interface PromptInput {
  readonly claims: PromptClaimInput[];
  readonly symbols: { symbol: string; gloss: string }[];
  /** Force which claim is the conclusion; overrides indicator recovery. */
  readonly conclusionIndex?: number;
  readonly uri?: string;
}

function toSymbolEntries(symbols: { symbol: string; gloss: string }[]): SymbolEntry[] {
  return symbols.map((s) => ({
    kind: "atom" as const,
    name: s.symbol,
    arity: 0,
    gloss: s.gloss,
    source: "stated" as const,
    spans: [],
  }));
}

/** Evaluate a prompt's claims into a Tier-2 LogicReport. */
export function evaluatePrompt(input: PromptInput): LogicReport {
  const texts = input.claims.map((c) => c.text ?? c.dsl);
  const ci =
    input.conclusionIndex !== undefined ? input.conclusionIndex : recoverConclusionIndex(texts);

  const span = (c: PromptClaimInput) => {
    const s: { uri?: string; startLine?: number; text?: string } = {};
    if (input.uri !== undefined) s.uri = input.uri;
    if (c.line !== undefined) s.startLine = c.line;
    if (c.text !== undefined) s.text = c.text;
    return Object.keys(s).length > 0 ? [s] : [];
  };

  const premises = input.claims
    .map((c, i) => ({ c, i }))
    .filter(({ i }) => i !== ci)
    .map(({ c }) => ({
      ast: parse(c.dsl),
      role: (c.supplied ? "premise-supplied" : "premise") as "premise" | "premise-supplied",
      source: (c.supplied ? "supplied" : "stated") as "supplied" | "stated",
      spans: span(c),
    }));

  const arg: FormalizedArgument = {
    logic: "PROP",
    symbols: toSymbolEntries(input.symbols),
    premises,
    ...(ci >= 0 && input.claims[ci]
      ? {
          conclusion: {
            ast: parse(input.claims[ci]!.dsl),
            source: "stated" as const,
            spans: span(input.claims[ci]!),
            inferred: false,
          },
        }
      : {}),
    outOfScope: [],
    translationConfidence: { band: "high", score: 0.9, signals: ["supplied-formalization"] },
  };

  return evaluateArgument(arg, { tier: 2, ...(input.uri !== undefined ? { uri: input.uri } : {}) });
}
