/**
 * Tier-4 repo adapter (DESIGN §5 Tier-4 row, §11 v0.4).
 *
 * Composes the Tier-3 extractor across many documents and checks **cross-file**
 * consistency — the differentiator a single-sentence tool structurally cannot
 * produce (a minimal conflicting subset whose claims span different files).
 *
 * Core stays FS-free: the caller (CLI / MCP) reads the repo and passes file
 * contents in. This adapter does the deterministic parts: **selection** (default
 * high-recall over markdown docs, with a reported manifest so a false-exclude is
 * never silent), per-file claim extraction with `path:line`, a repo-wide symbol
 * dictionary, cross-file consistency, and a mandatory **coverage caveat**. The
 * LLM predicate-canonicalization / residual-synonymy passes (DESIGN §5) are
 * deferred to `@entailer/translate`.
 */
import { atomsOf, type Formula } from "../ast.js";
import { extractDoc } from "./markdown.js";
import { checkConsistency } from "../verify/index.js";
import { buildReport, type LogicReport } from "../report.js";

export interface RepoFile {
  readonly uri: string;
  readonly content: string;
}

export interface RepoInput {
  readonly files: RepoFile[];
  /** Override the markdown-name test (default: any `.md` / `.markdown`). */
  readonly isProseDoc?: (uri: string) => boolean;
}

const MARKDOWN_RE = /\.(md|markdown)$/i;

/** Categorize a load-bearing doc for the manifest (DESIGN §5 always-include globs). */
function loadBearingRole(uri: string): string {
  const base = uri.toLowerCase();
  if (/(^|\/)readme/.test(base)) return "readme";
  if (/(^|\/)spec/.test(base) || base.includes("spec")) return "spec";
  if (/(^|\/)rfc/.test(base) || base.includes("rfc")) return "rfc";
  if (base.includes("/decisions/") || base.includes("/adr/") || /(^|\/)adr/.test(base))
    return "decision-record";
  if (base.includes("requirements")) return "requirements";
  if (base.includes("acceptance")) return "acceptance";
  return "general-doc";
}

interface RepoClaim {
  readonly uri: string;
  readonly line: number;
  readonly dsl: string;
  readonly formula: Formula;
}

/** Evaluate a set of repo files into a Tier-4 cross-file consistency report. */
export function evaluateRepo(input: RepoInput): LogicReport {
  const isProse = input.isProseDoc ?? ((uri: string) => MARKDOWN_RE.test(uri));

  const manifest: { uri: string; included: boolean; role: string; reason: string }[] = [];
  const claims: RepoClaim[] = [];
  const glosses = new Map<string, string>();

  for (const file of input.files) {
    if (!isProse(file.uri)) {
      manifest.push({
        uri: file.uri,
        included: false,
        role: "non-prose",
        reason: "not a markdown/prose doc",
      });
      continue;
    }
    const role = loadBearingRole(file.uri);
    const doc = extractDoc(file.content);
    for (const s of doc.symbols) if (!glosses.has(s.symbol)) glosses.set(s.symbol, s.gloss);
    for (const c of doc.claims) {
      claims.push({ uri: file.uri, line: c.line, dsl: c.dsl, formula: c.formula });
    }
    manifest.push({
      uri: file.uri,
      included: true,
      role,
      reason:
        doc.claims.length > 0
          ? `${doc.claims.length} entailer claim(s); high-recall include`
          : "markdown doc with no entailer claims; high-recall include",
    });
  }

  const includedCount = manifest.filter((m) => m.included).length;
  const excludedCount = manifest.length - includedCount;
  const coverageCaveat =
    `Verdict holds over ${includedCount} selected doc(s); ${excludedCount} excluded. ` +
    `Selection is heuristic (markdown name-based, high-recall); the LLM tail classifier ` +
    `and predicate canonicalization are deferred, so cross-file aliases may be missed.`;

  // Repo-wide symbol dictionary over every atom that actually appears.
  const usedAtoms = new Set<string>();
  for (const c of claims) for (const a of atomsOf(c.formula)) usedAtoms.add(a);
  const symbolDictionary = [...usedAtoms].sort().map((a) => ({
    symbol: a,
    gloss: glosses.get(a) ?? `atom ${a} (no English gloss supplied)`,
  }));

  const formalization = claims.map((c, i) => ({
    id: `r${i}`,
    english: c.dsl,
    formal: c.dsl,
    role: "premise" as const,
    logicSystem: "PL",
    source: { uri: c.uri, line: c.line },
  }));

  if (claims.length === 0) {
    return buildReport({
      target: { tier: 4 },
      verdict: "NO_ISSUE_FOUND",
      validity: { status: "NO_ISSUE_FOUND", method: "n/a" },
      consistency: { status: "SAT" },
      symbolDictionary:
        symbolDictionary.length > 0
          ? symbolDictionary
          : [{ symbol: "(none)", gloss: "no entailer claims across selected docs" }],
      formalization,
      selectionManifest: manifest,
      coverageCaveat,
      verdictConfidence: { band: "high", reason: "no entailer claims found across selected docs" },
      soundnessRisk: [{ note: "No fenced `entailer` claim blocks were found in any selected doc." }],
    });
  }

  const cons = checkConsistency(claims.map((c) => c.formula));

  if (cons.status === "UNSAT") {
    const subset = cons.minimalConflictingSubset ?? claims.map((_, i) => i);
    const spanFiles = new Set(subset.map((i) => claims[i]!.uri));
    return buildReport({
      target: { tier: 4 },
      verdict: "INCONSISTENT",
      validity: { status: "NO_ISSUE_FOUND", method: "consistency-first" },
      consistency: { status: "UNSAT", minimalConflictingSubset: subset },
      symbolDictionary,
      formalization,
      selectionManifest: manifest,
      coverageCaveat,
      verdictConfidence: {
        band: "high",
        reason:
          spanFiles.size > 1
            ? `cross-file conflict spanning ${spanFiles.size} docs`
            : "a minimal conflicting subset was found",
      },
      findings: subset.map((idx) => ({
        severity: "blocker" as const,
        name: spanFiles.size > 1 ? "cross-file-inconsistency" : "inconsistent-requirement",
        signature: "repo-wide Γ unsat",
        why: `Claim "${claims[idx]!.dsl}" participates in a contradiction across the selected docs.`,
        location: { uri: claims[idx]!.uri, line: claims[idx]!.line },
      })),
    });
  }

  return buildReport({
    target: { tier: 4 },
    verdict: "NO_ISSUE_FOUND",
    validity: { status: "NO_ISSUE_FOUND", method: "consistency-only" },
    consistency: { status: "SAT", ...(cons.model ? { model: cons.model } : {}) },
    symbolDictionary,
    formalization,
    selectionManifest: manifest,
    coverageCaveat,
    verdictConfidence: { band: "high", reason: "the selected docs' claims are jointly satisfiable" },
  });
}
