/* ------------------------------------------------------------------ *
 * Engine drivers — the deterministic bridge from a hand-formalized
 * Scenario to a presentational Analysis. Every verdict here is computed
 * live by the published @entailer/core; nothing is hard-coded.
 * ------------------------------------------------------------------ */
import {
  checkConsistency,
  checkValidity,
  classify,
  evaluateSentence,
  isPropositional,
  parse,
} from "@entailer/core";
import { truthTableToSvg, truthTableView } from "@entailer/viz";
import { HONESTY, type Analysis, type Badge, type Gloss, type Scenario } from "../data/scenarios.js";
import { recolorTruthTable } from "./recolor.js";

export function glossFor(glosses: Gloss[], symbol: string): string {
  return glosses.find((g) => g.symbol === symbol)?.gloss ?? `“${symbol}” (no gloss supplied)`;
}

function analyzeSpec(s: Scenario): Analysis {
  const formulas = s.statements.map((st) => parse(st.dsl));
  const cons = checkConsistency(formulas);
  const base = { glosses: s.glosses, statements: s.statements, contract: HONESTY };
  if (cons.status === "UNSAT") {
    const subset = cons.minimalConflictingSubset ?? s.statements.map((_, i) => i);
    return {
      ...base,
      badge: "inconsistent",
      label: "INCONSISTENT",
      summary: "These requirements contradict each other. No system can satisfy them all.",
      highlight: new Set(subset),
      cert: {
        kind: "conflict",
        heading: "Minimal conflicting set",
        blurb: "The smallest group of claims that already cannot all hold. Remove or weaken one of these:",
        conflict: subset.map((i) => ({ label: s.statements[i]!.label, english: s.statements[i]!.english })),
      },
    };
  }
  return {
    ...base,
    badge: "valid",
    label: "CONSISTENT",
    summary: "No contradiction found among the requirements. (That is not a proof they are correct, only that they can co-exist.)",
    highlight: new Set(),
    cert: { kind: "none", heading: "No conflict found", blurb: "Every requirement can hold at the same time." },
  };
}

function analyzeArgument(s: Scenario): Analysis {
  const premises = s.statements.filter((st) => st.role === "premise");
  const conclusion = s.statements.find((st) => st.role === "conclusion")!;
  const concIdx = s.statements.indexOf(conclusion);
  const val = checkValidity(premises.map((p) => parse(p.dsl)), parse(conclusion.dsl));
  const base = { glosses: s.glosses, statements: s.statements, contract: HONESTY };
  if (val.verdict === "VALID" && !val.vacuous) {
    return {
      ...base,
      badge: "valid",
      label: "VALID",
      summary: "The conclusion follows by logic alone. No case makes the premises true and the conclusion false.",
      highlight: new Set([concIdx]),
      cert: {
        kind: "proof",
        heading: "Why it holds",
        blurb: "Entailer assumed the premises and the negated conclusion, then refuted that combination — every branch closes, so no counterexample exists.",
      },
    };
  }
  if (val.verdict === "INVALID") {
    const model = val.counterModel ?? {};
    return {
      ...base,
      badge: "invalid",
      label: "INVALID",
      summary: "The conclusion does not follow. Here is a case where every premise is true yet the conclusion is false.",
      highlight: new Set([concIdx]),
      cert: {
        kind: "counter-model",
        heading: "Counterexample",
        blurb: "Make these true — every premise still holds, but the conclusion fails:",
        model: Object.entries(model).map(([sym, v]) => ({ gloss: glossFor(s.glosses, sym), value: v })),
      },
    };
  }
  return {
    ...base,
    badge: "unknown",
    label: val.vacuous ? "VACUOUSLY VALID" : "UNKNOWN",
    summary: val.vacuous
      ? "The premises contradict each other, so the argument is 'valid' only in the empty sense. Fix the premises first."
      : "Outside the engine's decidable fragment — entailer refuses to guess.",
    highlight: new Set(),
    cert: { kind: "none", heading: "No clean verdict", blurb: "Entailer returns UNKNOWN rather than a guessed answer." },
  };
}

function analyzeClaim(s: Scenario): Analysis {
  const st = s.statements[0]!;
  const formula = parse(st.dsl);
  const report = evaluateSentence(st.dsl);
  const k = classify(formula);
  const base = { glosses: s.glosses, statements: s.statements, contract: report.honestyContract };
  const vacuous = report.validity.vacuous || k.kind === "vacuous";
  const tt =
    isPropositional(formula) && report.symbolDictionary.length <= 4
      ? recolorTruthTable(truthTableToSvg(truthTableView(formula)))
      : null;
  const map: Record<string, { badge: Badge; label: string; summary: string }> = {
    tautology: { badge: "neutral", label: "TAUTOLOGY", summary: "True under every assignment — it rules nothing out, so it carries no information." },
    contradiction: { badge: "invalid", label: "CONTRADICTION", summary: "False under every assignment — it can never hold." },
    contingent: { badge: "neutral", label: "CONTINGENT", summary: "True in some cases, false in others. Its truth depends on the facts." },
    vacuous: { badge: "unknown", label: "VACUOUSLY TRUE", summary: "True only because its precondition can never be met — not a real guarantee." },
  };
  const pick = vacuous ? map.vacuous! : map[k.kind]!;
  return {
    ...base,
    badge: pick.badge,
    label: pick.label,
    summary: pick.summary,
    highlight: new Set(),
    truthTable: tt,
    cert: vacuous
      ? { kind: "classify", heading: "Vacuity flag", blurb: "The antecedent “the flag is both on and off” is unsatisfiable, so the implication is true for free. Entailer surfaces that instead of hiding it." }
      : { kind: "classify", heading: "Classification", blurb: `Entailer classified this claim as ${k.kind} by its truth table.` },
  };
}

export function analyze(s: Scenario): Analysis {
  if (s.kind === "spec") return analyzeSpec(s);
  if (s.kind === "argument") return analyzeArgument(s);
  return analyzeClaim(s);
}
