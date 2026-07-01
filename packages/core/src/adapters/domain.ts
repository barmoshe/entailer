/**
 * The domain-entailment lens adapter (concept faithfulness).
 *
 * Core stays FS-free: the CLI resolves the boundary globs, reads files, and
 * passes contents in. This adapter does the deterministic parts and is honest
 * about its one weak link — **classification** ("is this token a `member`-use?").
 * Classification is lexical (identifier token-splitting + vocabulary
 * set-membership), so it is high-recall and noisy; every code-level finding names
 * the sites it rests on so a human confirms the classification as the adjudication
 * step. We never emit an absolute "same/different concept" judgment — only a
 * declared-disjointness *collision* fires a rank-1 verdict.
 *
 * Order matters: the **honest-recursion pre-check** runs first (is the
 * declaration even self-consistent?) before any file is read.
 */
import type { RepoFile } from "./repo.js";
import {
  compileRelations,
  normalizeConcept,
  subsumptionClosure,
  type CompiledRelation,
  type DomainSpec,
} from "../domain-spec.js";
import {
  buildDomainReport,
  type DomainFinding,
  type DomainReport,
} from "../domain-report.js";

export interface DomainInput {
  readonly files: RepoFile[];
  readonly spec: DomainSpec;
  readonly mode?: "pr" | "repo";
  /**
   * Site signatures introduced/changed by a PR diff. When set (gate=introduced),
   * a rank-1 verdict fires only if its site is in this set — a regression gate.
   */
  readonly introduced?: ReadonlySet<string>;
}

const CODE_RE = /\.(ts|tsx|js|jsx|mjs|cjs|py|go|rs|java|rb|kt|swift|c|h|cpp|cs)$/i;
const PROSE_RE = /\.(md|markdown|txt|rst|adoc)$/i;
const IDENT_RE = /[A-Za-z_][A-Za-z0-9_]*/g;
/** Same-line co-occurrences of two disjoint concepts before a split-personality hint. */
const RANK2_THRESHOLD = 3;

function fileRole(uri: string): string {
  if (CODE_RE.test(uri)) return "code";
  if (PROSE_RE.test(uri)) return "prose";
  return "other";
}

/** Split an identifier into lower-cased tokens across camelCase and snake_case. */
export function splitIdentifier(id: string): string[] {
  return id
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((t) => t.toLowerCase());
}

/** A stable signature for a leak site, decoupled from drifting line numbers. */
export function siteSignature(cluster: string, concepts: string[], uri: string, identifier: string): string {
  return `${cluster}|${[...concepts].sort().join("+")}|${uri}|${identifier.toLowerCase()}`;
}

interface ConceptVocab {
  readonly concept: string;
  readonly tokens: ReadonlySet<string>;
}

/** Build the per-concept vocabulary sets (concept name is always its own vocabulary). */
function vocabularies(spec: DomainSpec): ConceptVocab[] {
  return spec.concepts.map((c) => {
    const name = normalizeConcept(c.concept);
    const tokens = new Set<string>([name, ...c.vocabulary.map((v) => v.trim().toLowerCase())]);
    return { concept: name, tokens };
  });
}

/** Which declared concepts a single identifier names (via its split tokens). */
function conceptsOf(identifier: string, vocab: ConceptVocab[]): Set<string> {
  const tokens = new Set(splitIdentifier(identifier));
  const hit = new Set<string>();
  for (const cv of vocab) {
    for (const t of cv.tokens) {
      if (tokens.has(t)) {
        hit.add(cv.concept);
        break;
      }
    }
  }
  return hit;
}

/** Every unordered disjoint pair, keyed for lookup. */
function disjointPairs(relations: readonly CompiledRelation[]): Set<string> {
  const pairs = new Set<string>();
  for (const r of relations) {
    if (r.kind === "disjoint") pairs.add([r.a, r.b].sort().join("|"));
  }
  return pairs;
}

/**
 * The honest-recursion pre-check: is the declaration self-consistent, before we
 * touch a single file? Catches (a) a pair declared both `is-a` and disjoint (a
 * subclass forced empty), and (b) an identifier listed as both a positive and a
 * negative example. Both are deterministic rank-1 DECLARATION contradictions.
 * Cross-checking a *prose* `rule` against the examples is reader-assisted and
 * deferred (it needs the semantic reader, not shipped in v0.1).
 */
export function honestRecursionPrecheck(spec: DomainSpec, relations: CompiledRelation[]): DomainFinding[] {
  const findings: DomainFinding[] = [];
  const closure = subsumptionClosure(relations);

  for (const r of relations) {
    if (r.kind !== "disjoint") continue;
    const aSubsumesB = (closure.get(r.a) ?? new Set()).has(r.b);
    const bSubsumesA = (closure.get(r.b) ?? new Set()).has(r.a);
    if (aSubsumesB || bSubsumesA) {
      const sub = aSubsumesB ? `${r.a} is-a ${r.b}` : `${r.b} is-a ${r.a}`;
      findings.push({
        rank: "rank-1",
        evidenceType: "DECLARATION",
        name: "self-contradictory-declaration",
        severity: "blocker",
        readerAssisted: false,
        concepts: [r.a, r.b],
        receipts: [
          { uri: `cluster:${spec.cluster}`, note: r.source },
          { uri: `cluster:${spec.cluster}`, note: sub },
        ],
        minimalConflictingSubset: [0, 1],
        claim: `\`${r.a}\` and \`${r.b}\` are declared both disjoint and in a subsumption — the subclass is forced empty.`,
        question: `Did you mean \`${r.a}\` is-a \`${r.b}\`, or is-not? It cannot be both.`,
      });
    }
  }

  for (const c of spec.concepts) {
    const pos = new Set(c.examples.positive.map((e) => e.trim().toLowerCase()));
    for (const e of c.examples.negative) {
      if (pos.has(e.trim().toLowerCase())) {
        findings.push({
          rank: "rank-1",
          evidenceType: "DECLARATION",
          name: "contradictory-examples",
          severity: "blocker",
          readerAssisted: false,
          concepts: [normalizeConcept(c.concept)],
          receipts: [
            { uri: `cluster:${spec.cluster}`, note: `positive example "${e}"` },
            { uri: `cluster:${spec.cluster}`, note: `negative example "${e}"` },
          ],
          minimalConflictingSubset: [0, 1],
          claim: `\`${e}\` is listed as both a positive and a negative example of \`${c.concept}\`.`,
          question: `Is \`${e}\` a \`${c.concept}\` or not?`,
        });
      }
    }
  }

  return findings;
}

/**
 * Evaluate a set of files against a concept cluster. FS-free: files are supplied.
 * Runs the pre-check, then classifies identifier sites and fires:
 *  - rank-1 CONTRADICTION when one identifier fuses two declared-disjoint concepts;
 *  - rank-2 SPLIT-PERSONALITY (reader hint) when two disjoint concepts co-occur
 *    on the same line across sites without fusing (a "confirm these are separate").
 * Co-occurrence of an `is-a` pair (a `member` that *is* a `user`) is silence.
 */
export function evaluateDomain(input: DomainInput): DomainReport {
  const { spec } = input;
  const mode = input.mode ?? "repo";
  const relations = compileRelations(spec);
  const vocab = vocabularies(spec);
  const disjoint = disjointPairs(relations);

  const findings: DomainFinding[] = honestRecursionPrecheck(spec, relations);

  const manifest: { uri: string; included: boolean; role: string; reason: string }[] = [];
  // For rank-2: per-file, per-disjoint-pair count of same-line co-occurrences.
  const cooccur = new Map<string, { uri: string; line: number; pair: string; a: string; b: string }[]>();

  for (const file of input.files) {
    const role = fileRole(file.uri);
    if (role === "other") {
      manifest.push({ uri: file.uri, included: false, role, reason: "not a scanned code/prose file" });
      continue;
    }
    let siteCount = 0;
    const fileLines = file.content.split(/\r?\n/);
    fileLines.forEach((text, i) => {
      const line = i + 1;
      const lineConcepts = new Map<string, string>(); // concept -> identifier that named it on this line
      for (const m of text.matchAll(IDENT_RE)) {
        const identifier = m[0];
        const named = conceptsOf(identifier, vocab);
        if (named.size === 0) continue;
        siteCount += 1;
        // rank-1: a single identifier fusing two disjoint concepts.
        if (named.size >= 2) {
          const names = [...named];
          for (let x = 0; x < names.length; x++) {
            for (let y = x + 1; y < names.length; y++) {
              const key = [names[x]!, names[y]!].sort().join("|");
              if (!disjoint.has(key)) continue;
              const sig = siteSignature(spec.cluster, [names[x]!, names[y]!], file.uri, identifier);
              if (input.introduced && !input.introduced.has(sig)) continue;
              findings.push({
                rank: "rank-1",
                evidenceType: "CONTRADICTION",
                name: "concept-fusion",
                severity: "blocker",
                readerAssisted: false,
                concepts: [names[x]!, names[y]!],
                receipts: [
                  { uri: file.uri, line, note: names[x]! },
                  { uri: file.uri, line, note: names[y]! },
                ],
                minimalConflictingSubset: [0, 1],
                claim: `Identifier \`${identifier}\` names both \`${names[x]}\` and \`${names[y]}\`, which the cluster declares mutually exclusive.`,
                question: `Confirm the classification: does \`${identifier}\` really mean both \`${names[x]}\` and \`${names[y]}\`? If so, which is correct here?`,
              });
            }
          }
        }
        for (const c of named) if (!lineConcepts.has(c)) lineConcepts.set(c, identifier);
      }
      // rank-2 tally: distinct disjoint concepts co-occurring on this line.
      const present = [...lineConcepts.keys()];
      for (let x = 0; x < present.length; x++) {
        for (let y = x + 1; y < present.length; y++) {
          const key = [present[x]!, present[y]!].sort().join("|");
          if (!disjoint.has(key)) continue; // is-a co-occurrence is silence
          // skip if these were already fused into one identifier (rank-1 covers it)
          if (lineConcepts.get(present[x]!) === lineConcepts.get(present[y]!)) continue;
          if (!cooccur.has(key)) cooccur.set(key, []);
          cooccur.get(key)!.push({ uri: file.uri, line, pair: key, a: present[x]!, b: present[y]! });
        }
      }
    });
    manifest.push({
      uri: file.uri,
      included: true,
      role,
      reason: siteCount > 0 ? `${siteCount} classified concept site(s)` : "scanned; no concept sites",
    });
  }

  for (const [key, occurrences] of cooccur) {
    if (occurrences.length < RANK2_THRESHOLD) continue;
    const [a, b] = key.split("|");
    findings.push({
      rank: "rank-2",
      evidenceType: "SPLIT-PERSONALITY",
      name: "entangled-disjoint-concepts",
      severity: "minor",
      readerAssisted: true,
      concepts: [a!, b!],
      receipts: occurrences.slice(0, 8).map((o) => ({ uri: o.uri, line: o.line })),
      claim: "",
      question: `\`${a}\` and \`${b}\` are declared separate but co-occur ${occurrences.length}× — confirm the boundary between them holds here.`,
    });
  }

  // Symbol dictionary: the four-sided vocabulary the human declared.
  const symbolDictionary = vocab.map((cv) => ({
    symbol: cv.concept,
    gloss: `concept — vocabulary {${[...cv.tokens].join(", ")}}`,
  }));

  const scanned = manifest.filter((m) => m.included).length;
  const skipped = manifest.length - scanned;
  const coverageCaveat =
    `Verdict holds over ${scanned} scanned file(s); ${skipped} skipped. ` +
    `Classification is lexical (identifier token-split + vocabulary membership) — the irreducible ` +
    `weak link — so recall is high but precision depends on human confirmation of each site. Rank-2/3 ` +
    `are reader hints, not verdicts. False-positive rate must be read on a real overlapping diff, not ` +
    `only a clean fixture (where it is 0 by construction).`;

  return buildDomainReport({
    cluster: spec.cluster,
    mode,
    findings,
    symbolDictionary,
    selectionManifest: manifest,
    coverageCaveat,
  });
}
