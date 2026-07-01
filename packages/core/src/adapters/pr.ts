/**
 * Tier-5 pull-request adapter (DESIGN §5 Tier-5 row; delta/regression view).
 *
 * A PR is not "another repo": the differentiated check is a **base→head delta**
 * (deep-research, SonarQube "Clean as You Code" / ESLint bulk-suppressions /
 * reviewdog / Danger.js). We compute the base claim-set vs the head claim-set,
 * cross-file, and report what the PR **introduced / fixed** on top of the head's
 * absolute consistency. We also **fold the PR description's** fenced `entailer`
 * claims into the head, so "the PR says X but the code contradicts X" is catchable.
 *
 * Two orthogonal knobs (see PLAN-pr-tier.md):
 *   - `gate` drives the *exit-code* verdict: `head` (default) fails on any head
 *     inconsistency; `introduced` fails only when a new/changed claim participates
 *     in the head's minimal conflicting subset.
 *   - `descriptionSeverity` governs the folded PR-description claims: `fail`
 *     (default) treats them as first-class head claims; `warn` folds them but a
 *     *description-induced* contradiction is non-blocking (severity `major`,
 *     never drives the gate); `off` does not fold the description at all.
 *
 * Attribution is **exact per-claim**: entailer's claims have stable identity
 * (`uri` + `dsl`), so the delta names precisely which contradictions are new — the
 * edge over the count-based CI baselines, which cannot isolate the new violation.
 *
 * Core stays FS/network-free: the caller (CLI via `gh`/git, or MCP) supplies the
 * base + head file contents and the PR metadata.
 */
import { atomsOf, type Formula } from "../ast.js";
import { extractDoc } from "./markdown.js";
import { checkConsistency } from "../verify/index.js";
import { buildReport, type LogicReport, type Severity } from "../report.js";

export interface PrFile {
  readonly uri: string;
  readonly content: string;
}

export interface PrMetadata {
  readonly number?: number;
  readonly url?: string;
  readonly title?: string;
  /** The PR description body; its fenced `entailer` blocks fold into the head. */
  readonly body?: string;
  readonly baseRef?: string;
  readonly headRef?: string;
}

export type PrGate = "head" | "introduced";
export type DescriptionSeverity = "fail" | "warn" | "off";

export interface PrInput {
  readonly base: PrFile[];
  readonly head: PrFile[];
  readonly metadata?: PrMetadata;
  /** Exit-code policy. Default `head`. */
  readonly gate?: PrGate;
  /** How to treat the folded PR-description claims. Default `fail`. */
  readonly descriptionSeverity?: DescriptionSeverity;
  /** Override the markdown-name test (default: any `.md` / `.markdown`). */
  readonly isProseDoc?: (uri: string) => boolean;
}

const MARKDOWN_RE = /\.(md|markdown)$/i;

type Origin = "code" | "description";

interface PrClaim {
  readonly uri: string;
  readonly line: number;
  readonly dsl: string;
  readonly formula: Formula;
  readonly origin: Origin;
}

/** Stable per-claim identity: the assertion `dsl` within file `uri` (line-agnostic,
 * so a reformatted-but-unchanged claim is not mistaken for a new one). */
const keyOf = (c: { uri: string; dsl: string }): string => JSON.stringify([c.uri, c.dsl]);

/** Extract prose-doc claims (+ glosses) from a set of files. */
function collectClaims(
  files: PrFile[],
  isProse: (uri: string) => boolean,
  glosses: Map<string, string>,
): PrClaim[] {
  const out: PrClaim[] = [];
  for (const file of files) {
    if (!isProse(file.uri)) continue;
    const doc = extractDoc(file.content);
    for (const s of doc.symbols) if (!glosses.has(s.symbol)) glosses.set(s.symbol, s.gloss);
    for (const c of doc.claims) {
      out.push({ uri: file.uri, line: c.line, dsl: c.dsl, formula: c.formula, origin: "code" });
    }
  }
  return out;
}

/** Evaluate a pull request into a Tier-5 delta/regression report. */
export function evaluatePr(input: PrInput): LogicReport {
  const isProse = input.isProseDoc ?? ((uri: string) => MARKDOWN_RE.test(uri));
  const gate: PrGate = input.gate ?? "head";
  const descriptionSeverity: DescriptionSeverity = input.descriptionSeverity ?? "fail";
  const foldDescription = descriptionSeverity !== "off";

  const glosses = new Map<string, string>();

  const baseClaims = collectClaims(input.base, isProse, glosses);
  const headCodeClaims = collectClaims(input.head, isProse, glosses);

  // Fold the PR description as a synthetic head doc (unless `off`).
  const descUri = input.metadata?.number
    ? `PR#${input.metadata.number} (description)`
    : "(PR description)";
  const descClaims: PrClaim[] = [];
  if (foldDescription && input.metadata?.body) {
    const doc = extractDoc(input.metadata.body);
    for (const s of doc.symbols) if (!glosses.has(s.symbol)) glosses.set(s.symbol, s.gloss);
    for (const c of doc.claims) {
      descClaims.push({ uri: descUri, line: c.line, dsl: c.dsl, formula: c.formula, origin: "description" });
    }
  }

  const headClaims: PrClaim[] = [...headCodeClaims, ...descClaims];

  // Consistency runs: base, full head, and (for description-induced detection)
  // head-code-only. Indices into `headClaims` are the report's claim indices.
  const consBase = checkConsistency(baseClaims.map((c) => c.formula));
  const consHead = checkConsistency(headClaims.map((c) => c.formula));
  const consHeadCode =
    descClaims.length > 0 ? checkConsistency(headCodeClaims.map((c) => c.formula)) : consHead;

  // Delta by stable claim identity.
  const baseKeys = new Set(baseClaims.map(keyOf));
  const introducedIdx = new Set(
    headClaims.map((c, i) => (baseKeys.has(keyOf(c)) ? -1 : i)).filter((i) => i >= 0),
  );

  // Symbol dictionary over every atom that appears in the head.
  const usedAtoms = new Set<string>();
  for (const c of headClaims) for (const a of atomsOf(c.formula)) usedAtoms.add(a);
  const symbolDictionary =
    usedAtoms.size > 0
      ? [...usedAtoms].sort().map((a) => ({ symbol: a, gloss: glosses.get(a) ?? `atom ${a} (no English gloss supplied)` }))
      : [{ symbol: "(none)", gloss: "no entailer claims across the head's selected docs" }];

  const formalization = headClaims.map((c, i) => ({
    id: `pr${i}`,
    english: c.dsl,
    formal: c.dsl,
    role: "premise" as const,
    logicSystem: "PL",
    source: { uri: c.uri, line: c.line },
  }));

  // Selection manifest: base docs, head docs, the description doc.
  const changedKeys = new Set(headCodeClaims.filter((c) => introducedIdx.has(headClaims.indexOf(c))).map((c) => c.uri));
  const manifest: { uri: string; included: boolean; role: string; reason: string }[] = [];
  for (const f of input.base) {
    manifest.push({ uri: f.uri, included: isProse(f.uri), role: isProse(f.uri) ? "base-doc" : "non-prose", reason: isProse(f.uri) ? "base state" : "not a markdown/prose doc" });
  }
  for (const f of input.head) {
    const prose = isProse(f.uri);
    manifest.push({ uri: f.uri, included: prose, role: prose ? (changedKeys.has(f.uri) ? "head-doc (changed)" : "head-doc") : "non-prose", reason: prose ? "head state" : "not a markdown/prose doc" });
  }
  if (descClaims.length > 0) {
    manifest.push({ uri: descUri, included: true, role: "pr-description", reason: `${descClaims.length} folded entailer claim(s) from the PR body` });
  }

  const coverageCaveat =
    `Delta over ${baseClaims.length} base + ${headClaims.length} head claim(s); ` +
    `gate=${gate}, descriptionSeverity=${descriptionSeverity}. ` +
    `Selection is heuristic (markdown name-based, high-recall) and claim identity is ` +
    `\`uri:dsl\` (line-agnostic); a claim moved between files reads as introduced+removed. ` +
    `The LLM predicate-canonicalization pass is deferred, so cross-file aliases may be missed.`;

  // ---- Head is satisfiable: nothing wrong in the head at all. ----
  if (consHead.status === "SAT") {
    const fixed = consBase.status === "UNSAT" ? 1 : 0;
    return buildReport({
      target: { tier: 5 },
      verdict: "NO_ISSUE_FOUND",
      validity: { status: "NO_ISSUE_FOUND", method: "delta" },
      consistency: { status: "SAT", ...(consHead.model ? { model: consHead.model } : {}) },
      symbolDictionary,
      formalization,
      selectionManifest: manifest,
      coverageCaveat,
      delta: { base: consBase.status, head: "SAT", introduced: 0, fixed, preExisting: 0, gate },
      verdictConfidence: { band: "high", reason: fixed ? "PR resolves a pre-existing contradiction; head is now satisfiable" : "the head's claims are jointly satisfiable" },
      ...(fixed
        ? { findings: [{ severity: "note" as Severity, name: "pr-resolves-inconsistency", signature: "base UNSAT → head SAT", why: "This PR resolves a contradiction that existed in the base." }] }
        : {}),
    });
  }

  // ---- Head is UNSAT: attribute the conflict. ----
  const subset = consHead.minimalConflictingSubset ?? headClaims.map((_, i) => i);
  const introducedInSubset = subset.filter((i) => introducedIdx.has(i));
  const descriptionInSubset = subset.filter((i) => headClaims[i]!.origin === "description");
  // The contradiction exists only because of the folded description claims.
  const descriptionInduced =
    descClaims.length > 0 && descriptionInSubset.length > 0 && consHeadCode.status === "SAT";
  const softDescription = descriptionInduced && descriptionSeverity === "warn";

  // Gate decision (drives the exit-code verdict).
  const gateBlocks =
    !softDescription &&
    (gate === "head" ? true : introducedInSubset.length > 0);
  const verdict = gateBlocks ? "INCONSISTENT" : "NO_ISSUE_FOUND";

  const delta = {
    base: consBase.status,
    head: "UNSAT" as const,
    introduced: introducedInSubset.length,
    fixed: 0,
    preExisting: subset.length - introducedInSubset.length,
    ...(introducedInSubset.length > 0 ? { introducedSubset: introducedInSubset } : {}),
    gate,
  };

  const findings = subset.map((idx) => {
    const c = headClaims[idx]!;
    const isIntroduced = introducedIdx.has(idx);
    let severity: Severity;
    let name: string;
    if (c.origin === "description") {
      severity = softDescription ? "major" : "blocker";
      name = "pr-description-vs-code";
    } else if (isIntroduced) {
      severity = "blocker";
      name = "introduced-inconsistency";
    } else {
      severity = gate === "head" && verdict === "INCONSISTENT" ? "major" : "note";
      name = "pre-existing-inconsistency";
    }
    return {
      severity,
      name,
      signature: "head Γ unsat",
      why: `Claim "${c.dsl}" participates in the head's minimal conflicting subset (${isIntroduced ? "introduced by this PR" : "pre-existing"}${c.origin === "description" ? "; from the PR description" : ""}).`,
      location: { uri: c.uri, line: c.line },
    };
  });

  // Honesty: when the head stays inconsistent but the gate passes, say so loudly.
  if (verdict === "NO_ISSUE_FOUND") {
    findings.push({
      severity: "note",
      name: "head-still-inconsistent",
      signature: "gate passed over an inconsistent head",
      why: `The head still carries ${delta.preExisting} pre-existing contradiction(s); this PR introduced none${softDescription ? " (a description-induced contradiction was downgraded to a warning)" : ""}.`,
      location: { uri: subset[0] !== undefined ? headClaims[subset[0]]!.uri : "", line: subset[0] !== undefined ? headClaims[subset[0]]!.line : 0 },
    });
  }

  return buildReport({
    target: { tier: 5 },
    verdict,
    validity: { status: "NO_ISSUE_FOUND", method: "consistency-first" },
    consistency: { status: "UNSAT", minimalConflictingSubset: subset },
    symbolDictionary,
    formalization,
    selectionManifest: manifest,
    coverageCaveat,
    delta,
    verdictConfidence: {
      band: "high",
      reason: gateBlocks
        ? introducedInSubset.length > 0
          ? `the PR introduces a contradiction (${introducedInSubset.length} new claim(s) in the minimal conflicting subset)`
          : "gate=head blocks on the inconsistent head state"
        : "the inconsistency is pre-existing; this PR introduced none",
    },
    findings,
  });
}
