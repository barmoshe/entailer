/**
 * Tier-1 sentence adapter (DESIGN §5 Tier-1 row, §11 v0.1 item 2).
 *
 * One claim in, one classified `LogicReport` out. The classification mode runs
 * the three checks (is φ valid? is φ sat? is ¬φ valid?) → tautology / contingent /
 * contradiction, plus a vacuity flag for conditionals with an unsatisfiable
 * antecedent. Out-of-fragment input yields UNKNOWN, never a guess.
 */
import { atomsOf, formulaToString, isPropositional, not, type Formula } from "../ast.js";
import { isContradiction } from "../evaluate.js";
import { parse } from "../parser.js";
import { refute } from "../tableau.js";
import { classify } from "../verify/index.js";
import { buildReport, type LogicReport } from "../report.js";
import type { FormalizedArgument } from "../ir.js";

/** A supplied IR (degenerate ClaimSet of one). */
export interface SuppliedArgInput {
  readonly argument: FormalizedArgument;
  readonly english?: string;
  readonly uri?: string;
}
/** A DSL string plus its symbol dictionary. */
export interface DslSentenceInput {
  readonly dsl: string;
  readonly symbols: { symbol: string; gloss: string }[];
  readonly english?: string;
  readonly uri?: string;
}
export type SentenceInput = string | DslSentenceInput | SuppliedArgInput;

interface Normalized {
  readonly formula: Formula;
  readonly symbolDictionary: { symbol: string; gloss: string }[];
  readonly english: string;
  readonly uri?: string;
  readonly translationConfidence?: { band: "low" | "med" | "high"; score: number };
}

function isSupplied(i: SentenceInput): i is SuppliedArgInput {
  return typeof i === "object" && "argument" in i;
}
function isDsl(i: SentenceInput): i is DslSentenceInput {
  return typeof i === "object" && "dsl" in i;
}

/** The single claim of a degenerate argument: its lone premise (else conclusion). */
function claimOf(arg: FormalizedArgument): Formula {
  if (arg.premises.length > 0) return arg.premises[0]!.ast;
  if (arg.conclusion) return arg.conclusion.ast;
  throw new Error("sentence adapter: the supplied argument has no claim");
}

function normalize(input: SentenceInput): Normalized {
  if (typeof input === "string") {
    const formula = parse(input);
    // Auto-derive a dictionary so the honesty invariant is satisfied even for a
    // bare DSL string. The glosses are honest placeholders, not invented English.
    const symbolDictionary = atomsOf(formula).map((symbol) => ({
      symbol,
      gloss: `atom ${symbol} (no English gloss supplied)`,
    }));
    return { formula, symbolDictionary, english: input };
  }
  if (isDsl(input)) {
    return {
      formula: parse(input.dsl),
      symbolDictionary: input.symbols,
      english: input.english ?? input.dsl,
      ...(input.uri !== undefined ? { uri: input.uri } : {}),
    };
  }
  if (isSupplied(input)) {
    const arg = input.argument;
    const formula = claimOf(arg);
    return {
      formula,
      symbolDictionary: arg.symbols.map((s) => ({ symbol: s.name, gloss: s.gloss })),
      english: input.english ?? arg.symbols.map((s) => s.gloss).join("; "),
      ...(input.uri !== undefined ? { uri: input.uri } : {}),
      translationConfidence: {
        band: arg.translationConfidence.band,
        score: arg.translationConfidence.score,
      },
    };
  }
  throw new Error("sentence adapter: unrecognized input");
}

/** Is this formula a conditional whose antecedent can never be true? */
function isVacuousConditional(f: Formula): boolean {
  return f.type === "implies" && isPropositional(f.left) && isContradiction(f.left);
}

/** Evaluate a single sentence into a classified, honesty-checked LogicReport. */
export function evaluateSentence(input: SentenceInput): LogicReport {
  const n = normalize(input);
  const formal = formulaToString(n.formula);

  const formalization = [
    {
      id: "s1",
      english: n.english,
      formal,
      role: "premise" as const,
      logicSystem: isPropositional(n.formula) ? "PL" : "FOL",
      ...(n.translationConfidence ? { translationConfidence: n.translationConfidence } : {}),
    },
  ];

  // Out of fragment → UNKNOWN, never a guess.
  if (!isPropositional(n.formula)) {
    return buildReport({
      target: { tier: 1, ...(n.uri !== undefined ? { uri: n.uri } : {}) },
      verdict: "UNKNOWN",
      validity: { status: "UNKNOWN", method: "out-of-fragment" },
      consistency: { status: "UNKNOWN" },
      symbolDictionary: n.symbolDictionary,
      formalization,
      soundnessRisk: [
        { note: "Non-propositional sentence; FOL/SMT escalation is deferred (v0.3)." },
      ],
      verdictConfidence: { band: "low", reason: "out of the decidable propositional fragment" },
      ...(n.translationConfidence ? { translationConfidence: n.translationConfidence } : {}),
    });
  }

  const { kind } = classify(n.formula);
  const vacuous = isVacuousConditional(n.formula);
  const soundnessRisk: { note: string }[] = vacuous
    ? [{ note: "Vacuously true: the antecedent is unsatisfiable, so the conditional says nothing." }]
    : [];

  // Low translation confidence forces UNKNOWN (the schema would reject otherwise).
  if (n.translationConfidence?.band === "low") {
    return buildReport({
      target: { tier: 1, ...(n.uri !== undefined ? { uri: n.uri } : {}) },
      verdict: "UNKNOWN",
      validity: { status: "UNKNOWN", method: "classification" },
      consistency: { status: "UNKNOWN" },
      symbolDictionary: n.symbolDictionary,
      formalization,
      soundnessRisk,
      verdictConfidence: { band: "low", reason: "translation confidence is low" },
      translationConfidence: n.translationConfidence,
    });
  }

  const base = {
    target: { tier: 1 as const, ...(n.uri !== undefined ? { uri: n.uri } : {}) },
    symbolDictionary: n.symbolDictionary,
    formalization,
    soundnessRisk,
    ...(n.translationConfidence ? { translationConfidence: n.translationConfidence } : {}),
  };

  if (kind === "tautology") {
    const proof = refute([not(n.formula)]);
    return buildReport({
      ...base,
      verdict: "VALID",
      validity: {
        status: "VALID",
        method: "tableau-refutation",
        ...(proof.closed ? { proof: proof.tree } : {}),
        ...(vacuous ? { vacuous: true } : {}),
      },
      consistency: { status: "SAT" },
    });
  }

  if (kind === "contradiction") {
    return buildReport({
      ...base,
      verdict: "INCONSISTENT",
      validity: { status: "NO_ISSUE_FOUND", method: "classification" },
      consistency: { status: "UNSAT", minimalConflictingSubset: [0] },
      verdictConfidence: { band: "high", reason: "decidable classification: unsatisfiable" },
      findings: [
        {
          severity: "major",
          name: "self-contradiction",
          signature: "φ ∧ ¬φ unsat",
          why: "The sentence is false under every assignment.",
        },
      ],
    });
  }

  // contingent
  return buildReport({
    ...base,
    verdict: "NO_ISSUE_FOUND",
    validity: { status: "NO_ISSUE_FOUND", method: "classification" },
    consistency: { status: "SAT" },
    verdictConfidence: { band: "high", reason: "decidable classification: contingent" },
  });
}
