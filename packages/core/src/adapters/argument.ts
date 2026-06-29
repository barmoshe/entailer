/**
 * Argument adapter over a *supplied* formalization (DESIGN §6 verify surface).
 *
 * This is the deterministic report-assembly for an IR that already carries
 * premises and (optionally) a conclusion. It is NOT the v0.2 prompt tier: there is
 * no prose, no conclusion recovery, no LLM. It just runs the core verify API and
 * assembles an honesty-checked LogicReport, so the A/B/C golden fixtures and any
 * caller with a hand- or machine-built IR share one evaluation path.
 */
import { formulaToString, isPropositional, type Formula } from "../ast.js";
import { checkConsistency, checkValidity } from "../verify/index.js";
import { buildReport, type LogicReport } from "../report.js";
import type { FormalizedArgument } from "../ir.js";

export interface EvaluateArgumentOptions {
  readonly uri?: string;
  readonly tier?: 1 | 2 | 3 | 4;
}

function dictOf(arg: FormalizedArgument): { symbol: string; gloss: string }[] {
  return arg.symbols.map((s) => ({ symbol: s.name, gloss: s.gloss }));
}

interface FormalizationEntry {
  id: string;
  english: string;
  formal: string;
  role: "premise" | "premise-supplied" | "conclusion";
  logicSystem: string;
}

function formalizationOf(arg: FormalizedArgument): FormalizationEntry[] {
  const entries: FormalizationEntry[] = arg.premises.map((p, i) => ({
    id: `p${i}`,
    english: p.spans[0]?.text ?? formulaToString(p.ast),
    formal: formulaToString(p.ast),
    role: p.role,
    logicSystem: isPropositional(p.ast) ? "PL" : "FOL",
  }));
  if (arg.conclusion) {
    entries.push({
      id: "c",
      english: arg.conclusion.spans[0]?.text ?? formulaToString(arg.conclusion.ast),
      formal: formulaToString(arg.conclusion.ast),
      role: "conclusion",
      logicSystem: isPropositional(arg.conclusion.ast) ? "PL" : "FOL",
    });
  }
  return entries;
}

/** Evaluate a supplied argument into a validity/consistency LogicReport. */
export function evaluateArgument(
  arg: FormalizedArgument,
  opts: EvaluateArgumentOptions = {},
): LogicReport {
  const tier = opts.tier ?? 2;
  const target = { tier, ...(opts.uri !== undefined ? { uri: opts.uri } : {}) };
  const symbolDictionary = dictOf(arg);
  const formalization = formalizationOf(arg);
  const premiseFormulas: Formula[] = arg.premises.map((p) => p.ast);
  const allProp =
    premiseFormulas.every(isPropositional) &&
    (arg.conclusion ? isPropositional(arg.conclusion.ast) : true);

  // Out of fragment, or low translation confidence → UNKNOWN, never a guess.
  if (!allProp) {
    return buildReport({
      target,
      verdict: "UNKNOWN",
      validity: { status: "UNKNOWN", method: "out-of-fragment" },
      consistency: { status: "UNKNOWN" },
      symbolDictionary,
      formalization,
      verdictConfidence: { band: "low", reason: "out of the decidable propositional fragment" },
    });
  }
  if (arg.translationConfidence.band === "low") {
    return buildReport({
      target,
      verdict: "UNKNOWN",
      validity: { status: "UNKNOWN", method: "classification" },
      consistency: { status: "UNKNOWN" },
      symbolDictionary,
      formalization,
      verdictConfidence: { band: "low", reason: "translation confidence is low" },
      translationConfidence: {
        band: arg.translationConfidence.band,
        score: arg.translationConfidence.score,
      },
    });
  }

  const cons = checkConsistency(premiseFormulas);

  // Inconsistent premises: the consistency failure is the headline, not a vacuous VALID.
  if (cons.status === "UNSAT") {
    const subset = cons.minimalConflictingSubset ?? premiseFormulas.map((_, i) => i);
    const validity = arg.conclusion
      ? checkValidity(premiseFormulas, arg.conclusion.ast)
      : undefined;
    return buildReport({
      target,
      verdict: "INCONSISTENT",
      validity: {
        status: validity?.verdict ?? "NO_ISSUE_FOUND",
        method: validity?.method ?? "consistency-first",
        ...(validity?.vacuous ? { vacuous: true } : {}),
      },
      consistency: { status: "UNSAT", minimalConflictingSubset: subset },
      symbolDictionary,
      formalization,
      verdictConfidence: { band: "high", reason: "a minimal conflicting subset was found" },
      findings: [
        {
          severity: "blocker",
          name: "inconsistent-premises",
          signature: "Γ unsat",
          why: `Premises [${subset.join(", ")}] cannot all hold at once.`,
        },
      ],
    });
  }

  // Consistent premises. If there is a conclusion, check the entailment.
  if (arg.conclusion) {
    const val = checkValidity(premiseFormulas, arg.conclusion.ast);
    if (val.verdict === "VALID") {
      return buildReport({
        target,
        verdict: "VALID",
        validity: {
          status: "VALID",
          method: val.method,
          ...(val.proof ? { proof: val.proof } : {}),
        },
        consistency: { status: "SAT", ...(cons.model ? { model: cons.model } : {}) },
        symbolDictionary,
        formalization,
      });
    }
    if (val.verdict === "INVALID") {
      return buildReport({
        target,
        verdict: "INVALID",
        validity: {
          status: "INVALID",
          method: val.method,
          ...(val.counterModel ? { counterModel: val.counterModel } : {}),
        },
        consistency: { status: "SAT", ...(cons.model ? { model: cons.model } : {}) },
        symbolDictionary,
        formalization,
        findings: [
          {
            severity: "major",
            name: "invalid-inference",
            signature: "Γ ⊭ φ",
            why: "The conclusion does not follow; a counter-model satisfies the premises but not the conclusion.",
          },
        ],
      });
    }
  }

  // Consistent, and either no conclusion or an undecidable one.
  return buildReport({
    target,
    verdict: "NO_ISSUE_FOUND",
    validity: { status: "NO_ISSUE_FOUND", method: "consistency-only" },
    consistency: { status: "SAT", ...(cons.model ? { model: cons.model } : {}) },
    symbolDictionary,
    formalization,
    verdictConfidence: { band: "high", reason: "premises are jointly satisfiable" },
  });
}
