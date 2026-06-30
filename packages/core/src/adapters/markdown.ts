/**
 * Tier-3 markdown adapter (DESIGN §5 Tier-3 row).
 *
 * Scans a Markdown document for fenced ```entailer blocks, each carrying a small
 * claim list, and runs **within-doc consistency** over every claim, reporting the
 * minimal conflicting subset back to `path:line`. This is the deterministic slice:
 * the claims arrive already formalized (one DSL claim per line), so there is no LLM
 * prose→logic step. Turning arbitrary prose into claims is deferred to
 * `@entailer/translate`.
 *
 * Block grammar (one item per line, inside a ```entailer fence):
 *   let <name> = <english gloss>   # declare a symbol's gloss
 *   <dsl claim>                    # a requirement / asserted claim
 *   # ...                          # a comment (ignored)
 *
 * Non-`entailer` code fences are ignored entirely (the "drop code" rule), so the
 * doc's prose and examples never get mistaken for claims.
 */
import { atomsOf, type Formula } from "../ast.js";
import { parse } from "../parser.js";
import { checkConsistency } from "../verify/index.js";
import { buildReport, type LogicReport } from "../report.js";

export interface ExtractedClaim {
  readonly dsl: string;
  readonly formula: Formula;
  readonly line: number;
}
export interface ExtractedDoc {
  readonly claims: ExtractedClaim[];
  readonly symbols: { symbol: string; gloss: string }[];
}

const FENCE = /^(\s*)(```+|~~~+)\s*([A-Za-z0-9_-]*)\s*$/;

interface RawBlock {
  readonly lang: string;
  readonly lines: { text: string; line: number }[];
}

/** Split a markdown string into its fenced code blocks (with 1-based lines). */
function fencedBlocks(md: string): RawBlock[] {
  const out: RawBlock[] = [];
  const lines = md.split(/\r?\n/);
  let open: { lang: string; fence: string; lines: { text: string; line: number }[] } | null = null;
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]!;
    const m = raw.match(FENCE);
    if (m) {
      const fence = m[2]!;
      if (open === null) {
        open = { lang: (m[3] ?? "").toLowerCase(), fence, lines: [] };
      } else if (raw.trimStart().startsWith(open.fence)) {
        out.push({ lang: open.lang, lines: open.lines });
        open = null;
      } else {
        open.lines.push({ text: raw, line: i + 1 });
      }
      continue;
    }
    if (open) open.lines.push({ text: raw, line: i + 1 });
  }
  return out;
}

const LET = /^let\s+([A-Za-z][A-Za-z0-9_]*)\s*=\s*(.+)$/;

/** Extract entailer claims + symbol glosses from a markdown document. */
export function extractDoc(md: string): ExtractedDoc {
  const claims: ExtractedClaim[] = [];
  const glosses = new Map<string, string>();

  for (const block of fencedBlocks(md)) {
    if (block.lang !== "entailer") continue;
    for (const { text, line } of block.lines) {
      const trimmed = text.trim();
      if (trimmed === "" || trimmed.startsWith("#")) continue;
      const letMatch = trimmed.match(LET);
      if (letMatch) {
        glosses.set(letMatch[1]!, letMatch[2]!.trim());
        continue;
      }
      claims.push({ dsl: trimmed, formula: parse(trimmed), line });
    }
  }

  // Symbol dictionary: declared glosses first, then any undeclared atoms.
  const usedAtoms = new Set<string>();
  for (const c of claims) for (const a of atomsOf(c.formula)) usedAtoms.add(a);
  const symbols: { symbol: string; gloss: string }[] = [];
  for (const a of [...usedAtoms].sort()) {
    symbols.push({ symbol: a, gloss: glosses.get(a) ?? `atom ${a} (no English gloss supplied)` });
  }
  return { claims, symbols };
}

export interface MarkdownInput {
  readonly markdown: string;
  readonly uri?: string;
}

/** Evaluate a markdown document into a Tier-3 within-doc consistency report. */
export function evaluateMarkdown(input: MarkdownInput): LogicReport {
  const { claims, symbols } = extractDoc(input.markdown);
  const uri = input.uri;
  const loc = (line: number) => ({ ...(uri !== undefined ? { uri } : {}), line });

  const formalization = claims.map((c, i) => ({
    id: `m${i}`,
    english: c.dsl,
    formal: c.dsl,
    role: "premise" as const,
    logicSystem: "PL",
    source: loc(c.line),
  }));

  // No claims at all: nothing to check, but never claim "consistent".
  if (claims.length === 0) {
    return buildReport({
      target: { tier: 3, ...(uri !== undefined ? { uri } : {}) },
      verdict: "NO_ISSUE_FOUND",
      validity: { status: "NO_ISSUE_FOUND", method: "n/a" },
      consistency: { status: "SAT" },
      symbolDictionary: symbols.length > 0 ? symbols : [{ symbol: "(none)", gloss: "no entailer claims found" }],
      formalization,
      verdictConfidence: { band: "high", reason: "no entailer claim blocks in the document" },
      soundnessRisk: [{ note: "No fenced `entailer` claim blocks were found in this document." }],
    });
  }

  const cons = checkConsistency(claims.map((c) => c.formula));

  if (cons.status === "UNSAT") {
    const subset = cons.minimalConflictingSubset ?? claims.map((_, i) => i);
    return buildReport({
      target: { tier: 3, ...(uri !== undefined ? { uri } : {}) },
      verdict: "INCONSISTENT",
      validity: { status: "NO_ISSUE_FOUND", method: "consistency-first" },
      consistency: { status: "UNSAT", minimalConflictingSubset: subset },
      symbolDictionary: symbols,
      formalization,
      verdictConfidence: { band: "high", reason: "a minimal conflicting subset was found" },
      findings: subset.map((idx) => ({
        severity: "blocker" as const,
        name: "inconsistent-requirement",
        signature: "within-doc Γ unsat",
        why: `Claim "${claims[idx]!.dsl}" participates in a contradiction.`,
        location: loc(claims[idx]!.line),
      })),
    });
  }

  return buildReport({
    target: { tier: 3, ...(uri !== undefined ? { uri } : {}) },
    verdict: "NO_ISSUE_FOUND",
    validity: { status: "NO_ISSUE_FOUND", method: "consistency-only" },
    consistency: { status: "SAT", ...(cons.model ? { model: cons.model } : {}) },
    symbolDictionary: symbols,
    formalization,
    verdictConfidence: { band: "high", reason: "the document's claims are jointly satisfiable" },
  });
}
