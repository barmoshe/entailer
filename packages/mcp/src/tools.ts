/**
 * The MCP tool logic, factored out of the server registration so it is unit
 * testable without an MCP transport. Each `run*` is pure: it parses input, calls
 * `@entailer/core`, and returns a CallToolResult-shaped outcome (content +
 * structuredContent). All logic stays in core; these are thin adapters.
 *
 * Default path is one-call (DESIGN §7): the caller formalizes in-context via the
 * skill, then calls these deterministic tools. The `evaluate_*` tools return the
 * full LogicReport whose schema forbids a verdict with no symbol dictionary.
 */
import { z } from "zod";
import {
  ParseError,
  checkConsistency,
  checkValidity,
  classify,
  evaluateArgument,
  evaluateMarkdown,
  evaluatePr,
  evaluatePrompt,
  evaluateRepo,
  evaluateSentence,
  parse,
  parseFormalizedArgument,
  toMarkdown,
  verdictSchema,
  type Formula,
} from "@entailer/core";

export interface ToolOutcome {
  content: { type: "text"; text: string }[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
  // CallToolResult carries an open index signature (_meta passthrough).
  [k: string]: unknown;
}

const text = (s: string): ToolOutcome["content"] => [{ type: "text", text: s }];
const fail = (msg: string): ToolOutcome => ({ content: text(msg), isError: true });

/** Parse a list of DSL strings, surfacing the first parse error. */
function parseAll(strings: string[]): { ok: true; formulas: Formula[] } | { ok: false; msg: string } {
  const formulas: Formula[] = [];
  for (const s of strings) {
    try {
      formulas.push(parse(s));
    } catch (e) {
      if (e instanceof ParseError) return { ok: false, msg: `parse error in "${s}": ${e.message}` };
      throw e;
    }
  }
  return { ok: true, formulas };
}

// ---- check_validity -------------------------------------------------------

export const checkValidityInput = {
  premises: z.array(z.string()).describe("premises as logic-DSL strings, e.g. [\"p\", \"p -> q\"]"),
  conclusion: z.string().describe("the conclusion as a logic-DSL string"),
};
export const checkValidityOutput = {
  verdict: z.enum(["VALID", "INVALID", "UNKNOWN"]),
  method: z.string(),
  counterModel: z.record(z.string(), z.boolean()).optional(),
  vacuous: z.boolean().optional(),
  reason: z.string().optional(),
};

export function runCheckValidity(args: { premises: string[]; conclusion: string }): ToolOutcome {
  const ps = parseAll(args.premises);
  if (!ps.ok) return fail(ps.msg);
  let conclusion: Formula;
  try {
    conclusion = parse(args.conclusion);
  } catch (e) {
    if (e instanceof ParseError) return fail(`parse error in conclusion: ${e.message}`);
    throw e;
  }
  const r = checkValidity(ps.formulas, conclusion);
  const structuredContent = {
    verdict: r.verdict,
    method: r.method,
    ...(r.counterModel ? { counterModel: r.counterModel } : {}),
    ...(r.vacuous ? { vacuous: true } : {}),
    ...(r.reason ? { reason: r.reason } : {}),
  };
  const cm = r.counterModel
    ? ` Counter-model: ${Object.entries(r.counterModel).map(([k, v]) => `${k}=${v ? "T" : "F"}`).join(", ")}.`
    : "";
  return {
    content: text(`${r.verdict} (${r.method}).${r.vacuous ? " Vacuous: premises are inconsistent." : ""}${cm}`),
    structuredContent,
  };
}

// ---- check_consistency ----------------------------------------------------

export const checkConsistencyInput = {
  formulas: z.array(z.string()).describe("the claim set as logic-DSL strings"),
};
export const checkConsistencyOutput = {
  status: z.enum(["SAT", "UNSAT", "UNKNOWN"]),
  model: z.record(z.string(), z.boolean()).optional(),
  minimalConflictingSubset: z.array(z.number().int()).optional(),
  reason: z.string().optional(),
};

export function runCheckConsistency(args: { formulas: string[] }): ToolOutcome {
  const ps = parseAll(args.formulas);
  if (!ps.ok) return fail(ps.msg);
  const r = checkConsistency(ps.formulas);
  const structuredContent = {
    status: r.status,
    ...(r.model ? { model: r.model } : {}),
    ...(r.minimalConflictingSubset ? { minimalConflictingSubset: r.minimalConflictingSubset } : {}),
    ...(r.reason ? { reason: r.reason } : {}),
  };
  const subset = r.minimalConflictingSubset
    ? ` Minimal conflicting subset: claims [${r.minimalConflictingSubset.join(", ")}].`
    : "";
  return { content: text(`${r.status} (${r.method}).${subset}`), structuredContent };
}

// ---- classify_formula -----------------------------------------------------

export const classifyInput = { formula: z.string().describe("a single formula as a logic-DSL string") };
export const classifyOutput = {
  kind: z.enum(["tautology", "contradiction", "contingent", "vacuous"]),
  reason: z.string().optional(),
};

export function runClassify(args: { formula: string }): ToolOutcome {
  let f: Formula;
  try {
    f = parse(args.formula);
  } catch (e) {
    if (e instanceof ParseError) return fail(`parse error: ${e.message}`);
    throw e;
  }
  const r = classify(f);
  return {
    content: text(`${args.formula} is ${r.kind}${r.reason ? ` (${r.reason})` : ""}.`),
    structuredContent: { kind: r.kind, ...(r.reason ? { reason: r.reason } : {}) },
  };
}

// ---- evaluate_sentence ----------------------------------------------------

export const evaluateSentenceInput = {
  dsl: z.string().describe("the claim as a logic-DSL string"),
  symbols: z
    .array(z.object({ symbol: z.string(), gloss: z.string() }))
    .optional()
    .describe("the symbol dictionary (atom -> exact English); recommended for an honest report"),
};
export const evaluateOutput = {
  verdict: verdictSchema,
  report: z.record(z.string(), z.unknown()).describe("the full LogicReport"),
  markdown: z.string(),
};

export function runEvaluateSentence(args: { dsl: string; symbols?: { symbol: string; gloss: string }[] }): ToolOutcome {
  try {
    const report = evaluateSentence(args.symbols ? { dsl: args.dsl, symbols: args.symbols } : args.dsl);
    return {
      content: text(toMarkdown(report)),
      structuredContent: { verdict: report.verdict, report, markdown: toMarkdown(report) },
    };
  } catch (e) {
    if (e instanceof ParseError) return fail(`parse error: ${e.message}`);
    return fail(`invalid input: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ---- evaluate_argument ----------------------------------------------------

export const evaluateArgumentInput = {
  ir: z.record(z.string(), z.unknown()).describe("a FormalizedArgument IR object (premises, conclusion, symbols)"),
};

export function runEvaluateArgument(args: { ir: Record<string, unknown> }): ToolOutcome {
  try {
    const ir = parseFormalizedArgument(args.ir);
    const report = evaluateArgument(ir);
    return {
      content: text(toMarkdown(report)),
      structuredContent: { verdict: report.verdict, report, markdown: toMarkdown(report) },
    };
  } catch (e) {
    return fail(`invalid IR: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ---- evaluate_prompt (Tier 2) ---------------------------------------------

export const evaluatePromptInput = {
  claims: z
    .array(
      z.object({
        dsl: z.string(),
        text: z.string().optional(),
        supplied: z.boolean().optional(),
        line: z.number().int().optional(),
      }),
    )
    .describe("the prompt's claims as logic-DSL strings (+ surface text for conclusion recovery)"),
  symbols: z.array(z.object({ symbol: z.string(), gloss: z.string() })),
  conclusionIndex: z.number().int().optional().describe("force which claim is the conclusion"),
};

export function runEvaluatePrompt(args: {
  claims: { dsl: string; text?: string; supplied?: boolean; line?: number }[];
  symbols: { symbol: string; gloss: string }[];
  conclusionIndex?: number;
}): ToolOutcome {
  try {
    const report = evaluatePrompt(args);
    return {
      content: text(toMarkdown(report)),
      structuredContent: { verdict: report.verdict, report, markdown: toMarkdown(report) },
    };
  } catch (e) {
    if (e instanceof ParseError) return fail(`parse error: ${e.message}`);
    return fail(`invalid prompt: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ---- evaluate_markdown (Tier 3) -------------------------------------------

export const evaluateMarkdownInput = {
  markdown: z.string().describe("the markdown document body"),
  uri: z.string().optional().describe("the document path, for path:line findings"),
};

export function runEvaluateMarkdown(args: { markdown: string; uri?: string }): ToolOutcome {
  try {
    const report = evaluateMarkdown(args);
    return {
      content: text(toMarkdown(report)),
      structuredContent: { verdict: report.verdict, report, markdown: toMarkdown(report) },
    };
  } catch (e) {
    if (e instanceof ParseError) return fail(`parse error: ${e.message}`);
    return fail(`invalid markdown: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ---- evaluate_repo (Tier 4) -----------------------------------------------

export const evaluateRepoInput = {
  files: z
    .array(z.object({ uri: z.string(), content: z.string() }))
    .describe("the repo's files (the caller reads the filesystem; core stays FS-free)"),
};

export function runEvaluateRepo(args: { files: { uri: string; content: string }[] }): ToolOutcome {
  try {
    const report = evaluateRepo({ files: args.files });
    return {
      content: text(toMarkdown(report)),
      structuredContent: { verdict: report.verdict, report, markdown: toMarkdown(report) },
    };
  } catch (e) {
    if (e instanceof ParseError) return fail(`parse error: ${e.message}`);
    return fail(`invalid repo input: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ---- evaluate_pull_request (Tier 5) ---------------------------------------

const prFileSchema = z.object({ uri: z.string(), content: z.string() });

export const evaluatePrInput = {
  base: z.array(prFileSchema).describe("the base branch's files (the caller fetches; core stays FS-free)"),
  head: z.array(prFileSchema).describe("the head (PR) branch's files"),
  metadata: z
    .object({
      number: z.number().int().optional(),
      url: z.string().optional(),
      title: z.string().optional(),
      body: z.string().optional().describe("the PR description; its fenced `entailer` blocks fold into the head"),
      baseRef: z.string().optional(),
      headRef: z.string().optional(),
    })
    .optional(),
  gate: z.enum(["head", "introduced"]).optional().describe("exit-code policy; default 'head'"),
  descriptionSeverity: z.enum(["fail", "warn", "off"]).optional().describe("how to treat the folded PR-description claims; default 'fail'"),
};

export function runEvaluatePr(args: {
  base: { uri: string; content: string }[];
  head: { uri: string; content: string }[];
  metadata?: { number?: number; url?: string; title?: string; body?: string; baseRef?: string; headRef?: string };
  gate?: "head" | "introduced";
  descriptionSeverity?: "fail" | "warn" | "off";
}): ToolOutcome {
  try {
    const report = evaluatePr(args);
    return {
      content: text(toMarkdown(report)),
      structuredContent: { verdict: report.verdict, report, markdown: toMarkdown(report) },
    };
  } catch (e) {
    if (e instanceof ParseError) return fail(`parse error: ${e.message}`);
    return fail(`invalid PR input: ${e instanceof Error ? e.message : String(e)}`);
  }
}
